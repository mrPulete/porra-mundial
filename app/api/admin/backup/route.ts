import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId");

  if (!leagueId) {
    return NextResponse.json({ error: "leagueId requerido" }, { status: 400 });
  }

  // Verify user is league owner
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true },
  });

  if (!league || league.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    // Fetch all user predictions for this league
    const predictions = await prisma.matchPrediction.findMany({
      where: { leagueId },
      select: {
        id: true,
        userId: true,
        matchId: true,
        predictedHome: true,
        predictedAway: true,
        predictedQualifiedTeamId: true,
      },
    });

    // Get unique match IDs from predictions
    const matchIds = [...new Set(predictions.map((p) => p.matchId))];

    // Fetch all relevant match results
    const matches = await prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: {
        id: true,
        excelCode: true,
        stage: true,
        homeScore: true,
        awayScore: true,
        qualifiedTeamId: true,
        isFinished: true,
      },
    });

    // Fetch all bonus answers
    const bonusAnswers = await prisma.bonusAnswer.findMany({
      where: { leagueId },
      select: {
        id: true,
        userId: true,
        questionId: true,
        answer: true,
      },
    });

    const backup = {
      leagueId,
      exportedAt: new Date().toISOString(),
      matches: matches.map((m) => ({
        id: m.id,
        code: m.excelCode,
        stage: m.stage,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        qualifiedTeamId: m.qualifiedTeamId,
        isFinished: m.isFinished,
      })),
      predictions: predictions.map((p) => ({
        id: p.id,
        userId: p.userId,
        matchId: p.matchId,
        homeScore: p.predictedHome,
        awayScore: p.predictedAway,
        predictedQualifiedTeamId: p.predictedQualifiedTeamId,
      })),
      bonusAnswers,
    };

    return NextResponse.json(backup);
  } catch (error) {
    return NextResponse.json({ error: "Error exportando backup" }, { status: 500 });
  }
}
