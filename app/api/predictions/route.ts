import { NextResponse } from "next/server";
import { MatchStage } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveLeagueForUser } from "@/lib/active-league";
import { getPredictionEditPolicy } from "@/lib/prediction-edit-policy";
import { getLeagueScoringConfig, resolvePenaltyPoints } from "@/lib/scoring-config";
import { recalculateRankings } from "@/lib/scoring-engine";
import {
  outcomeFromScore,
  penaltyTargetForStage,
  predictionPayloadSchema,
  sameMatchPrediction,
} from "@/lib/submission";

function requiresQualifiedTeam(stage: MatchStage, homeScore: number, awayScore: number) {
  return stage !== MatchStage.GROUP && stage !== MatchStage.THIRD_PLACE && homeScore === awayScore;
}

async function resolveActiveLeagueId(userId: string) {
  const context = await resolveActiveLeagueForUser(userId);
  return context.activeLeagueId;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    return NextResponse.json({ error: "El admin no puede enviar pronosticos" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = predictionPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const activeLeagueId = await resolveActiveLeagueId(session.user.id);
  if (!activeLeagueId) {
    return NextResponse.json({ error: "No hay liga activa" }, { status: 400 });
  }

  const hasLeagueAccess = await prisma.league.findFirst({
    where: {
      id: activeLeagueId,
      OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }],
    },
    select: { id: true },
  });

  if (!hasLeagueAccess) {
    return NextResponse.json({ error: "No tienes acceso a esta liga" }, { status: 403 });
  }

  const { mode, predictions } = parsed.data;

  const now = new Date();

  const matchIds = [...new Set(predictions.map((item) => item.matchId))];
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    select: {
      id: true,
      stage: true,
      lockAt: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  const matchById = new Map(matches.map((item) => [item.id, item] as const));

  for (const item of predictions) {
    const match = matchById.get(item.matchId);
    if (!match) {
      return NextResponse.json({ error: `Partido no encontrado: ${item.matchId}` }, { status: 400 });
    }

    if (match.lockAt <= now) {
      return NextResponse.json({ error: "La ronda esta bloqueada para editar pronosticos" }, { status: 403 });
    }

    if (requiresQualifiedTeam(match.stage, item.homeScore, item.awayScore)) {
      if (!item.predictedQualifiedTeamId) {
        return NextResponse.json(
          { error: "En cruces con empate debes indicar que equipo clasifica" },
          { status: 400 }
        );
      }

      if (
        item.predictedQualifiedTeamId !== match.homeTeamId &&
        item.predictedQualifiedTeamId !== match.awayTeamId
      ) {
        return NextResponse.json(
          { error: "El equipo clasificado no corresponde a este partido" },
          { status: 400 }
        );
      }
    }
  }

  if (mode === "draft") {
    await prisma.userLeagueDraft.upsert({
      where: {
        userId_leagueId: {
          userId: session.user.id,
          leagueId: activeLeagueId,
        },
      },
      update: {
        matchDrafts: predictions,
      },
      create: {
        userId: session.user.id,
        leagueId: activeLeagueId,
        matchDrafts: predictions,
        bonusDrafts: [],
      },
    });

    return NextResponse.json({ ok: true, status: "draft_saved", count: predictions.length });
  }

  const policy = await getPredictionEditPolicy();

  const { penaltyRules } = await getLeagueScoringConfig(activeLeagueId);

  const officialPredictions = await prisma.matchPrediction.findMany({
    where: {
      userId: session.user.id,
      leagueId: activeLeagueId,
      matchId: { in: matchIds },
    },
    select: {
      id: true,
      matchId: true,
      predictedHome: true,
      predictedAway: true,
      predictedQualifiedTeamId: true,
      penaltyPoints: true,
      createdAt: true,
    },
  });

  const officialByMatchId = new Map(officialPredictions.map((row) => [row.matchId, row] as const));

  let changesCount = 0;
  let penaltyApplied = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of predictions) {
      const match = matchById.get(item.matchId)!;
      const existing = officialByMatchId.get(item.matchId);
      const isChanged =
        !existing ||
        !sameMatchPrediction(
          {
            home: existing.predictedHome,
            away: existing.predictedAway,
            qualifiedTeamId: existing.predictedQualifiedTeamId,
          },
          {
            home: item.homeScore,
            away: item.awayScore,
            qualifiedTeamId: item.predictedQualifiedTeamId ?? null,
          }
        );

      if (!isChanged) {
        continue;
      }

      changesCount += 1;

      const target = penaltyTargetForStage(match.stage as MatchStage);
      const penalty = policy.submissionWindowStatus === "REOPENED" ? resolvePenaltyPoints(penaltyRules, target) : 0;
      penaltyApplied += penalty;

      const nextOutcome = outcomeFromScore(item.homeScore, item.awayScore);

      if (existing) {
        await tx.matchPrediction.update({
          where: { id: existing.id },
          data: {
            predictedHome: item.homeScore,
            predictedAway: item.awayScore,
            predictedOutcome: nextOutcome,
            predictedQualifiedTeamId: item.predictedQualifiedTeamId ?? null,
            penaltyPoints: existing.penaltyPoints + penalty,
          },
        });
      } else {
        await tx.matchPrediction.create({
          data: {
            userId: session.user.id,
            leagueId: activeLeagueId,
            matchId: item.matchId,
            predictedHome: item.homeScore,
            predictedAway: item.awayScore,
            predictedOutcome: nextOutcome,
            predictedQualifiedTeamId: item.predictedQualifiedTeamId ?? null,
            penaltyPoints: penalty,
          },
        });
      }

      await tx.predictionHistory.create({
        data: {
          leagueId: activeLeagueId,
          userId: session.user.id,
          matchId: item.matchId,
          changeType: existing ? "MATCH_EDIT" : "MATCH_SUBMIT",
          oldValue: existing
            ? {
                homeScore: existing.predictedHome,
                awayScore: existing.predictedAway,
                predictedQualifiedTeamId: existing.predictedQualifiedTeamId,
              }
            : undefined,
          newValue: {
            homeScore: item.homeScore,
            awayScore: item.awayScore,
            predictedQualifiedTeamId: item.predictedQualifiedTeamId ?? null,
          },
          penaltyApplied: penalty,
        },
      });
    }

    await tx.userLeagueDraft.upsert({
      where: {
        userId_leagueId: {
          userId: session.user.id,
          leagueId: activeLeagueId,
        },
      },
      update: {
        matchDrafts: [],
      },
      create: {
        userId: session.user.id,
        leagueId: activeLeagueId,
        matchDrafts: [],
        bonusDrafts: [],
      },
    });

    const [latestSubmission, officialMatches, officialBonus] = await Promise.all([
      tx.officialSubmission.findFirst({
        where: {
          userId: session.user.id,
          leagueId: activeLeagueId,
        },
        orderBy: {
          version: "desc",
        },
        select: { version: true },
      }),
      tx.matchPrediction.findMany({
        where: {
          userId: session.user.id,
          leagueId: activeLeagueId,
        },
        select: {
          matchId: true,
          predictedHome: true,
          predictedAway: true,
          predictedOutcome: true,
          predictedQualifiedTeamId: true,
          penaltyPoints: true,
        },
      }),
      tx.bonusAnswer.findMany({
        where: {
          userId: session.user.id,
          leagueId: activeLeagueId,
        },
        select: {
          questionId: true,
          answer: true,
          penaltyPoints: true,
        },
      }),
    ]);

    await tx.officialSubmission.create({
      data: {
        userId: session.user.id,
        leagueId: activeLeagueId,
        version: (latestSubmission?.version ?? 0) + 1,
        changesCount,
        penaltyApplied,
        matchSnapshot: officialMatches,
        bonusSnapshot: officialBonus,
      },
    });
  });

  await recalculateRankings(activeLeagueId);

  return NextResponse.json({
    ok: true,
    status: "official_submitted",
    changesCount,
    penaltyApplied,
    window: policy.submissionWindowStatus,
  });
}
