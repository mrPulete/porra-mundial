import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveLeagueForUser } from "@/lib/active-league";
import { getPredictionEditPolicy } from "@/lib/prediction-edit-policy";
import { getLeagueScoringConfig, resolvePenaltyPoints } from "@/lib/scoring-config";
import { recalculateRankings } from "@/lib/scoring-engine";
import { bonusPayloadSchema, sameBonusAnswer } from "@/lib/submission";

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
  const parsed = bonusPayloadSchema.safeParse(body);

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

  const { mode, answers } = parsed.data;

  if (mode === "draft") {
    await prisma.userLeagueDraft.upsert({
      where: {
        userId_leagueId: {
          userId: session.user.id,
          leagueId: activeLeagueId,
        },
      },
      update: {
        bonusDrafts: answers,
      },
      create: {
        userId: session.user.id,
        leagueId: activeLeagueId,
        bonusDrafts: answers,
        matchDrafts: [],
      },
    });

    return NextResponse.json({ ok: true, status: "draft_saved", count: answers.length });
  }

  const policy = await getPredictionEditPolicy();

  const questionIds = [...new Set(answers.map((item) => item.questionId))];
  const [questions, officialAnswers, { penaltyRules }] = await Promise.all([
    prisma.bonusQuestion.findMany({
      where: {
        id: { in: questionIds },
      },
      select: {
        id: true,
      },
    }),
    prisma.bonusAnswer.findMany({
      where: {
        userId: session.user.id,
        leagueId: activeLeagueId,
        questionId: { in: questionIds },
      },
      select: {
        id: true,
        questionId: true,
        answer: true,
        penaltyPoints: true,
      },
    }),
    getLeagueScoringConfig(activeLeagueId),
  ]);

  const validQuestionIds = new Set(questions.map((question) => question.id));
  for (const item of answers) {
    if (!validQuestionIds.has(item.questionId)) {
      return NextResponse.json({ error: `Pregunta no valida: ${item.questionId}` }, { status: 400 });
    }
  }

  const officialByQuestionId = new Map(
    officialAnswers.map((row) => [
      row.questionId,
      {
        id: row.id,
        answer:
          typeof row.answer === "string"
            ? row.answer
            : row.answer && typeof row.answer === "object" && typeof (row.answer as { value?: unknown }).value === "string"
              ? ((row.answer as { value: string }).value)
              : "",
        penaltyPoints: row.penaltyPoints,
      },
    ] as const)
  );

  let changesCount = 0;
  let penaltyApplied = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of answers) {
      const existing = officialByQuestionId.get(item.questionId);
      const isChanged = !existing || !sameBonusAnswer(existing.answer, item.answer);

      if (!isChanged) {
        continue;
      }

      changesCount += 1;
      const penalty = policy.submissionWindowStatus === "REOPENED" ? resolvePenaltyPoints(penaltyRules, "MATCH_EDIT") : 0;
      penaltyApplied += penalty;

      if (existing) {
        await tx.bonusAnswer.update({
          where: { id: existing.id },
          data: {
            answer: item.answer,
            penaltyPoints: existing.penaltyPoints + penalty,
          },
        });
      } else {
        await tx.bonusAnswer.create({
          data: {
            userId: session.user.id,
            leagueId: activeLeagueId,
            questionId: item.questionId,
            answer: item.answer,
            penaltyPoints: penalty,
          },
        });
      }

      await tx.predictionHistory.create({
        data: {
          leagueId: activeLeagueId,
          userId: session.user.id,
          questionId: item.questionId,
          changeType: existing ? "BONUS_EDIT" : "BONUS_SUBMIT",
          oldValue: existing ? { answer: existing.answer } : undefined,
          newValue: { answer: item.answer },
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
        bonusDrafts: [],
      },
      create: {
        userId: session.user.id,
        leagueId: activeLeagueId,
        matchDrafts: [],
        bonusDrafts: [],
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
