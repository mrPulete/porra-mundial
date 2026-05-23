import { MatchStage, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureLeagueScoringConfig } from "@/lib/scoring-config";
import { ensureDefaultFifaBonusQuestions } from "@/lib/default-bonus-questions";
import { getWorldCupMatches, getWorldCupTeams } from "@/lib/world-cup-data";

const payloadSchema = z.object({
  preserveAdmin: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  if (admins.length === 0) {
    return NextResponse.json({ error: "No hay admin para preservar" }, { status: 500 });
  }

  const ownerAdminId = admins[0].id;

  await prisma.$transaction(async (tx) => {
    await tx.predictionHistory.deleteMany();
    await tx.officialSubmission.deleteMany();
    await tx.userLeagueDraft.deleteMany();
    await tx.matchPrediction.deleteMany();
    await tx.bonusAnswer.deleteMany();
    await tx.ranking.deleteMany();

    await tx.bonusQuestion.deleteMany();
    await tx.penaltyRule.deleteMany();
    await tx.bonusRule.deleteMany();
    await tx.scoringRule.deleteMany();

    await tx.match.deleteMany();
    await tx.team.deleteMany();
    await tx.stageScoring.deleteMany();
    await tx.teamFootballData.deleteMany();

    await tx.leagueMember.deleteMany();
    await tx.league.deleteMany();

    await tx.session.deleteMany({
      where: {
        user: {
          role: { not: UserRole.ADMIN },
        },
      },
    });
    await tx.account.deleteMany({
      where: {
        user: {
          role: { not: UserRole.ADMIN },
        },
      },
    });
    await tx.user.deleteMany({ where: { role: { not: UserRole.ADMIN } } });
    await tx.verificationToken.deleteMany();

    await tx.league.create({
      data: {
        code: "GLOBAL",
        name: "Liga Global",
        ownerId: ownerAdminId,
      },
    });
  });

  const globalLeague = await prisma.league.findUnique({
    where: { code: "GLOBAL" },
    select: { id: true },
  });

  if (!globalLeague) {
    return NextResponse.json({ error: "No se pudo reconstruir la liga global" }, { status: 500 });
  }

  const teams = getWorldCupTeams();
  const fixtures = getWorldCupMatches();

  await prisma.team.createMany({
    data: teams.map((team) => ({
      code: team.code,
      name: team.name,
      flagEmoji: team.flagEmoji,
    })),
  });

  const dbTeams = await prisma.team.findMany({ select: { id: true, code: true } });
  const teamIdByCode = new Map(dbTeams.map((team) => [team.code, team.id]));

  await prisma.match.createMany({
    data: fixtures.map((fixture) => ({
      id: `excel-${fixture.roundOrder}`,
      stage: fixture.stage as MatchStage,
      group: fixture.group,
      excelCode: fixture.excelCode,
      roundOrder: fixture.roundOrder,
      kickoffAt: fixture.kickoffAt,
      lockAt: fixture.lockAt,
      bonusMultiplier: fixture.bonusMultiplier,
      homeTeamId: teamIdByCode.get(fixture.homeCode) as string,
      awayTeamId: teamIdByCode.get(fixture.awayCode) as string,
    })),
  });

  await ensureLeagueScoringConfig(globalLeague.id);
  await ensureDefaultFifaBonusQuestions();

  const [usersCount, leaguesCount, matchesCount] = await Promise.all([
    prisma.user.count(),
    prisma.league.count(),
    prisma.match.count(),
  ]);

  return NextResponse.json({
    ok: true,
    usersCount,
    leaguesCount,
    matchesCount,
    adminsPreserved: admins.length,
    message: "Porra reseteada. Se conservaron solo admins y se reconstruyo la base del torneo.",
  });
}
