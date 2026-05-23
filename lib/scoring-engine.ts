import { MatchStage, RankingScope } from "@prisma/client";
import type { ScoringRuleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLeagueScoringConfig, resolveRulePoints } from "@/lib/scoring-config";

const RULE_EXACT_SCORE = "EXACT_SCORE" as ScoringRuleType;
const RULE_OUTCOME_1X2 = "OUTCOME_1X2" as ScoringRuleType;
const RULE_SINGLE_TEAM_GOALS = "SINGLE_TEAM_GOALS" as ScoringRuleType;
const RULE_QUALIFIED_TEAM = "QUALIFIED_TEAM" as ScoringRuleType;

export function outcomeFromScore(home: number, away: number) {
  if (home > away) {
    return "1";
  }
  if (home < away) {
    return "2";
  }
  return "X";
}

function safeNumber(value: number | null | undefined) {
  return value ?? 0;
}

function resolveQualifiedTeamId(match: { homeTeamId: string; awayTeamId: string; homeScore: number | null; awayScore: number | null }) {
  if (match.homeScore === null || match.awayScore === null) {
    return null;
  }
  if (match.homeScore > match.awayScore) {
    return match.homeTeamId;
  }
  if (match.awayScore > match.homeScore) {
    return match.awayTeamId;
  }
  return null;
}

export async function recalculateRankings(leagueId?: string) {
  const leagues = await prisma.league.findMany({
    where: leagueId ? { id: leagueId } : undefined,
    include: { members: true },
  });

  const globalTotals = new Map<string, number>();

  for (const league of leagues) {
    const matchTotals = await prisma.matchPrediction.groupBy({
      by: ["userId"],
      where: { leagueId: league.id },
      _sum: {
        pointsAwarded: true,
        penaltyPoints: true,
      },
    });

    const bonusTotals = await prisma.bonusAnswer.groupBy({
      by: ["userId"],
      where: { leagueId: league.id },
      _sum: {
        pointsAwarded: true,
        penaltyPoints: true,
      },
    });

    const pointsByUser = new Map<string, number>();
    for (const member of league.members) {
      pointsByUser.set(member.userId, 0);
    }

    for (const row of matchTotals) {
      const current = pointsByUser.get(row.userId) ?? 0;
      pointsByUser.set(row.userId, current + safeNumber(row._sum.pointsAwarded) + safeNumber(row._sum.penaltyPoints));
    }

    for (const row of bonusTotals) {
      const current = pointsByUser.get(row.userId) ?? 0;
      pointsByUser.set(row.userId, current + safeNumber(row._sum.pointsAwarded) + safeNumber(row._sum.penaltyPoints));
    }

    const sortedLeague = [...pointsByUser.entries()].sort((a, b) => b[1] - a[1]);

    for (let i = 0; i < sortedLeague.length; i += 1) {
      const [userId, totalPoints] = sortedLeague[i];

      await prisma.ranking.upsert({
        where: {
          userId_scope_leagueId: {
            userId,
            scope: RankingScope.LEAGUE,
            leagueId: league.id,
          },
        },
        update: {
          totalPoints,
          rankPosition: i + 1,
        },
        create: {
          userId,
          scope: RankingScope.LEAGUE,
          leagueId: league.id,
          totalPoints,
          rankPosition: i + 1,
        },
      });

      globalTotals.set(userId, (globalTotals.get(userId) ?? 0) + totalPoints);
    }
  }

  if (!leagueId) {
    const sortedGlobal = [...globalTotals.entries()].sort((a, b) => b[1] - a[1]);

    for (let i = 0; i < sortedGlobal.length; i += 1) {
      const [userId, totalPoints] = sortedGlobal[i];
      const existing = await prisma.ranking.findFirst({
        where: {
          userId,
          scope: RankingScope.GLOBAL,
          leagueId: null,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.ranking.update({
          where: { id: existing.id },
          data: {
            totalPoints,
            rankPosition: i + 1,
          },
        });
      } else {
        await prisma.ranking.create({
          data: {
            userId,
            scope: RankingScope.GLOBAL,
            leagueId: null,
            totalPoints,
            rankPosition: i + 1,
          },
        });
      }
    }
  }
}

export async function recalculateFinishedMatchPoints(leagueId?: string) {
  const leagues = await prisma.league.findMany({
    where: leagueId ? { id: leagueId } : undefined,
    select: { id: true },
  });

  for (const league of leagues) {
    const { rules } = await getLeagueScoringConfig(league.id);

    const finishedMatches = await prisma.match.findMany({
      where: {
        isFinished: true,
        homeScore: { not: null },
        awayScore: { not: null },
      },
      include: {
        predictions: {
          where: {
            leagueId: league.id,
          },
        },
      },
    });

    for (const match of finishedMatches) {
      const finalHomeScore = match.homeScore ?? 0;
      const finalAwayScore = match.awayScore ?? 0;
      const actualOutcome = outcomeFromScore(finalHomeScore, finalAwayScore);
      const qualifiedTeamId = resolveQualifiedTeamId(match);

      for (const prediction of match.predictions) {
        const hitExact = prediction.predictedHome === finalHomeScore && prediction.predictedAway === finalAwayScore;
        const hitOutcome = prediction.predictedOutcome === actualOutcome;
        const hitHomeGoals = prediction.predictedHome === finalHomeScore;
        const hitAwayGoals = prediction.predictedAway === finalAwayScore;
        const oneGoalOnly = Number(hitHomeGoals !== hitAwayGoals);

        const exactPoints = hitExact ? resolveRulePoints(rules, match.stage as MatchStage, RULE_EXACT_SCORE) : 0;
        const outcomePoints = !hitExact && hitOutcome ? resolveRulePoints(rules, match.stage as MatchStage, RULE_OUTCOME_1X2) : 0;
        const oneGoalPoints = oneGoalOnly ? resolveRulePoints(rules, match.stage as MatchStage, RULE_SINGLE_TEAM_GOALS) : 0;

        const qualifierPoints =
          prediction.predictedQualifiedTeamId && qualifiedTeamId && prediction.predictedQualifiedTeamId === qualifiedTeamId
            ? resolveRulePoints(rules, match.stage as MatchStage, RULE_QUALIFIED_TEAM)
            : 0;

        const pointsAwarded = (exactPoints + outcomePoints + oneGoalPoints + qualifierPoints) * match.bonusMultiplier;
        const accuracy = (Number(hitExact) + Number(hitOutcome) + Number(hitHomeGoals) + Number(hitAwayGoals)) / 4;

        await prisma.matchPrediction.update({
          where: { id: prediction.id },
          data: {
            pointsAwarded,
            accuracy,
          },
        });
      }
    }
  }

  await recalculateRankings(leagueId);
}
