import { Match, MatchStage, Team } from "@prisma/client";

export type MatchWithTeams = Match & {
  homeTeam: Team;
  awayTeam: Team;
};

export function groupMatchesByStage(matches: MatchWithTeams[]) {
  const order: MatchStage[] = [
    "ROUND_OF_16",
    "QUARTER_FINAL",
    "SEMI_FINAL",
    "THIRD_PLACE",
    "FINAL",
  ];

  return order.map((stage) => ({
    stage,
    label: stage.replaceAll("_", " "),
    matches: matches
      .filter((m) => m.stage === stage)
      .sort((a, b) => a.roundOrder - b.roundOrder),
  }));
}
