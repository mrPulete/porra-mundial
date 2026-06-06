import { notFound } from "next/navigation";
import TeamPageView, { type TeamData } from "@/components/team-page";
import { getTeamFootballData } from "@/lib/football-api";
import { prisma } from "@/lib/prisma";

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return null;
  }
  return Math.round((value / total) * 100);
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const decodedTeamId = decodeURIComponent(teamId).trim();
  const normalizedCode = decodedTeamId.toUpperCase().replace(/[\s-]+/g, "_");

  const team =
    (await prisma.team.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        code: true,
        name: true,
        flagEmoji: true,
      },
    })) ??
    (await prisma.team.findFirst({
      where: {
        name: {
          equals: decodedTeamId,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        flagEmoji: true,
      },
    }));

  if (!team) {
    notFound();
  }

  const teamMatches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    include: {
      homeTeam: { select: { id: true, code: true, name: true, flagEmoji: true } },
      awayTeam: { select: { id: true, code: true, name: true, flagEmoji: true } },
      predictions: {
        select: {
          predictedOutcome: true,
        },
      },
    },
    orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
  });

  const group = teamMatches.find((match) => match.stage === "GROUP" && match.group)?.group ?? null;

  const rivalMap = new Map<string, { code: string; name: string; flag: string; rank: number }>();
  if (group) {
    for (const match of teamMatches) {
      if (match.stage !== "GROUP" || match.group !== group) {
        continue;
      }

      const candidates = [match.homeTeam, match.awayTeam];
      for (const candidate of candidates) {
        if (candidate.id === team.id || rivalMap.has(candidate.code)) {
          continue;
        }
        rivalMap.set(candidate.code, {
          code: candidate.code,
          name: candidate.name,
          flag: candidate.flagEmoji,
          rank: 99,
        });
      }
    }
  }

  const finishedMatches = teamMatches
    .filter((match) => match.isFinished && match.homeScore !== null && match.awayScore !== null)
    .sort((a, b) => b.kickoffAt.getTime() - a.kickoffAt.getTime());

  const recentForm = finishedMatches.slice(0, 5).map((match) => {
    const isHome = match.homeTeamId === team.id;
    const scored = isHome ? match.homeScore! : match.awayScore!;
    const conceded = isHome ? match.awayScore! : match.homeScore!;
    const result = scored > conceded ? "W" : scored < conceded ? "L" : "D";
    const opponent = isHome ? match.awayTeam : match.homeTeam;

    return {
      result,
      scored,
      conceded,
      opponent: {
        name: opponent.name,
        flagEmoji: opponent.flagEmoji,
        code: opponent.code,
      },
    };
  });

  const goalsFor = finishedMatches.reduce((sum, match) => {
    const isHome = match.homeTeamId === team.id;
    return sum + (isHome ? match.homeScore! : match.awayScore!);
  }, 0);

  const goalsConceded = finishedMatches.reduce((sum, match) => {
    const isHome = match.homeTeamId === team.id;
    return sum + (isHome ? match.awayScore! : match.homeScore!);
  }, 0);

  const calendar = teamMatches.map((match) => {
    const isHome = match.homeTeamId === team.id;
    const opponent = isHome ? match.awayTeam : match.homeTeam;
    const scored = match.homeScore === null || match.awayScore === null ? null : isHome ? match.homeScore : match.awayScore;
    const conceded = match.homeScore === null || match.awayScore === null ? null : isHome ? match.awayScore : match.homeScore;

    const totalPredictions = match.predictions.length;
    const teamWinPredictions = match.predictions.filter((prediction) =>
      isHome ? prediction.predictedOutcome === "1" : prediction.predictedOutcome === "2"
    ).length;
    const drawPredictions = match.predictions.filter((prediction) => prediction.predictedOutcome === "X").length;
    const teamLossPredictions = match.predictions.filter((prediction) =>
      isHome ? prediction.predictedOutcome === "2" : prediction.predictedOutcome === "1"
    ).length;

    return {
      opponentName: opponent.name,
      opponentFlag: opponent.flagEmoji,
      opponentCode: opponent.code,
      kickoffAt: match.kickoffAt.toISOString(),
      stage: match.stage,
      group: match.group,
      isFinished: match.isFinished,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      isHome,
      scored,
      conceded,
      totalPredictions,
      predictWinPct: toPercent(teamWinPredictions, totalPredictions),
      predictDrawPct: toPercent(drawPredictions, totalPredictions),
      predictLossPct: toPercent(teamLossPredictions, totalPredictions),
    };
  });

  const championQuestion = await prisma.bonusQuestion.findFirst({
    where: { code: "CHAMPION" },
    select: { id: true },
  });

  let championVotes = 0;
  let totalChampionPreds = 0;

  const upcomingWithPredictions = calendar.filter((item) => !item.isFinished && item.predictWinPct !== null);
  const avgWinPct =
    upcomingWithPredictions.length > 0
      ? Math.round(
          upcomingWithPredictions.reduce((sum, item) => sum + (item.predictWinPct ?? 0), 0) /
            upcomingWithPredictions.length
        )
      : null;

  let footballData = null;
  try {
    footballData = await getTeamFootballData(team.code);
  } catch {
    footballData = null;
  }

  const teamData: TeamData = {
    name: team.name,
    code: team.code,
    flag: team.flagEmoji,
    group,
    fifaRank: footballData?.fifaRanking ?? null,
    groupRivals: [...rivalMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es")),
    recentForm,
    goalsFor,
    goalsConceded,
    matchesPlayed: finishedMatches.length,
    calendar,
    predictionInsights: {
      avgWinPct,
      totalPredictions: teamMatches.reduce((sum, match) => sum + match.predictions.length, 0),
    },
    footballData,
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-2 py-4 md:px-4 md:py-6">
      <TeamPageView teamId={team.code} teamData={teamData} />
    </main>
  );
}
