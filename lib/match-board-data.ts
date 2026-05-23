import { prisma } from "@/lib/prisma";
import { resolveMatchVenue } from "@/lib/match-venues";
import { outcomeFromScore, parseDraftMatchEntries } from "@/lib/submission";

export type MatchBoardRow = {
  id: string;
  stage: string;
  group: string | null;
  code: string | null;
  kickoffAt: string;
  stadium: string;
  city: string;
  homeName: string;
  homeFlag: string;
  homeTeamId: string;
  homeTeamCode: string;
  awayName: string;
  awayFlag: string;
  awayTeamId: string;
  awayTeamCode: string;
  isFinished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  predictedHome: number | null;
  predictedAway: number | null;
  predictedQualifiedTeamId: string | null;
  predictedOutcome: "1" | "X" | "2" | null;
  officialPredictedHome: number | null;
  officialPredictedAway: number | null;
  officialPredictedQualifiedTeamId: string | null;
};

export async function getMatchBoardData(options: {
  mode: "predictions" | "results";
  userId?: string;
  leagueId?: string;
}): Promise<MatchBoardRow[]> {
  const includePredictions = Boolean(options.mode === "predictions" && options.userId && options.leagueId);

  const draft = includePredictions
    ? await prisma.userLeagueDraft.findUnique({
        where: {
          userId_leagueId: {
            userId: options.userId!,
            leagueId: options.leagueId!,
          },
        },
        select: {
          matchDrafts: true,
        },
      })
    : null;

  const draftMap = new Map(
    parseDraftMatchEntries(draft?.matchDrafts).map((entry) => [entry.matchId, entry] as const)
  );

  const matches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: includePredictions
        ? {
            where: {
              userId: options.userId,
              leagueId: options.leagueId,
            },
          }
        : false,
    },
    orderBy: [{ stage: "asc" }, { kickoffAt: "asc" }, { roundOrder: "asc" }],
  });

  return matches.map((match) => {
    const prediction = includePredictions ? match.predictions[0] : null;
    const hasExplicitPrediction = Boolean(prediction?.predictedOutcome);
    const draftPrediction = includePredictions ? draftMap.get(match.id) : undefined;
    const venue = resolveMatchVenue(match.roundOrder, match.excelCode);

    const officialPredictedHome =
      options.mode === "results"
        ? match.homeScore
        : hasExplicitPrediction
          ? prediction?.predictedHome ?? null
          : null;

    const officialPredictedAway =
      options.mode === "results"
        ? match.awayScore
        : hasExplicitPrediction
          ? prediction?.predictedAway ?? null
          : null;

    const officialPredictedQualifiedTeamId = options.mode === "results" ? null : prediction?.predictedQualifiedTeamId ?? null;

    const draftPredictedOutcome =
      draftPrediction
        ? outcomeFromScore(draftPrediction.homeScore, draftPrediction.awayScore)
        : null;

    return {
      id: match.id,
      stage: match.stage,
      group: match.group,
      code: match.excelCode,
      kickoffAt: match.kickoffAt.toISOString(),
      stadium: venue.stadium,
      city: venue.city,
      homeName: match.homeTeam.name,
      homeFlag: match.homeTeam.flagEmoji,
      homeTeamId: match.homeTeam.id,
      homeTeamCode: match.homeTeam.code,
      awayName: match.awayTeam.name,
      awayFlag: match.awayTeam.flagEmoji,
      awayTeamId: match.awayTeam.id,
      awayTeamCode: match.awayTeam.code,
      isFinished: match.isFinished,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      predictedHome:
        draftPrediction
          ? draftPrediction.homeScore
          : options.mode === "results"
          ? match.homeScore
          : hasExplicitPrediction
            ? prediction?.predictedHome ?? null
            : null,
      predictedAway:
        draftPrediction
          ? draftPrediction.awayScore
          : options.mode === "results"
          ? match.awayScore
          : hasExplicitPrediction
            ? prediction?.predictedAway ?? null
            : null,
      predictedQualifiedTeamId:
        options.mode === "results"
          ? null
          : draftPrediction
            ? draftPrediction.predictedQualifiedTeamId
            : prediction?.predictedQualifiedTeamId ?? null,
      predictedOutcome:
        draftPrediction
          ? draftPredictedOutcome
          : options.mode === "results"
          ? null
          : hasExplicitPrediction
            ? ((prediction?.predictedOutcome as "1" | "X" | "2" | null) ?? null)
            : null,
      officialPredictedHome,
      officialPredictedAway,
      officialPredictedQualifiedTeamId,
    };
  });
}