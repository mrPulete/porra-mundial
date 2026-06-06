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
    // Fetch all match results
    const matches = await prisma.match.findMany({
      where: { leagueId },
      select: {
        id: true,
        code: true,
        stage: true,
        homeScore: true,
        awayScore: true,
        qualifiedTeamId: true,
        isFinished: true,
      },
    });

    // Fetch all user predictions
    const predictions = await prisma.matchPrediction.findMany({
      where: { leagueId },
      select: {
        id: true,
        userId: true,
        matchId: true,
        homeScore: true,
        awayScore: true,
        predictedQualifiedTeamId: true,
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

    // Fetch all group ranking predictions
    const groupRankings = await prisma.groupRankingPrediction.findMany({
      where: { leagueId },
      select: {
        id: true,
        userId: true,
        groupCode: true,
        ranking: true,
      },
    });

    const backup = {
      leagueId,
      exportedAt: new Date().toISOString(),
      matches,
      predictions,
      bonusAnswers,
      groupRankings,
    };

    return NextResponse.json(backup);
  } catch (error) {
    return NextResponse.json({ error: "Error exportando backup" }, { status: 500 });
  }
}
