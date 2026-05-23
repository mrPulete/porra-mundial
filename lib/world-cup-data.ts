import dataset from "@/data/world-cup-2026.json";
import { MatchStage } from "@prisma/client";

export type TeamSeed = {
  code: string;
  name: string;
  flagEmoji: string;
  group: string;
  rank: number;
};

export type SeedMatch = {
  excelCode: string;
  stage: MatchStage;
  group: string | null;
  roundOrder: number;
  homeCode: string;
  awayCode: string;
  homeName: string;
  awayName: string;
  kickoffAt: Date;
  lockAt: Date;
  bonusMultiplier: number;
};

type ParsedWorldCupData = {
  groups: Record<string, TeamSeed[]>;
  teams: TeamSeed[];
  matches: SeedMatch[];
};

type KnockoutRef = {
  code: string;
  homeRef: string;
  awayRef: string;
  stage: MatchStage;
};

const ROUND_OF_32_REFS: KnockoutRef[] = [
  { code: "W73", homeRef: "2A", awayRef: "2B", stage: MatchStage.ROUND_OF_32 },
  { code: "W74", homeRef: "1E", awayRef: "3ABCDF", stage: MatchStage.ROUND_OF_32 },
  { code: "W75", homeRef: "1F", awayRef: "2C", stage: MatchStage.ROUND_OF_32 },
  { code: "W76", homeRef: "1C", awayRef: "2F", stage: MatchStage.ROUND_OF_32 },
  { code: "W77", homeRef: "1I", awayRef: "3CDFGH", stage: MatchStage.ROUND_OF_32 },
  { code: "W78", homeRef: "2E", awayRef: "2I", stage: MatchStage.ROUND_OF_32 },
  { code: "W79", homeRef: "1A", awayRef: "3CEFHI", stage: MatchStage.ROUND_OF_32 },
  { code: "W80", homeRef: "1L", awayRef: "3EHIJK", stage: MatchStage.ROUND_OF_32 },
  { code: "W81", homeRef: "1D", awayRef: "3BEFIJ", stage: MatchStage.ROUND_OF_32 },
  { code: "W82", homeRef: "1G", awayRef: "3AEHIJ", stage: MatchStage.ROUND_OF_32 },
  { code: "W83", homeRef: "2K", awayRef: "2L", stage: MatchStage.ROUND_OF_32 },
  { code: "W84", homeRef: "1H", awayRef: "2J", stage: MatchStage.ROUND_OF_32 },
  { code: "W85", homeRef: "1B", awayRef: "3EFGIJ", stage: MatchStage.ROUND_OF_32 },
  { code: "W86", homeRef: "1J", awayRef: "2H", stage: MatchStage.ROUND_OF_32 },
  { code: "W87", homeRef: "1K", awayRef: "3DEIJL", stage: MatchStage.ROUND_OF_32 },
  { code: "W88", homeRef: "2D", awayRef: "2G", stage: MatchStage.ROUND_OF_32 },
];

const ROUND_OF_16_REFS: KnockoutRef[] = [
  { code: "W89", homeRef: "W73", awayRef: "W75", stage: MatchStage.ROUND_OF_16 },
  { code: "W90", homeRef: "W74", awayRef: "W77", stage: MatchStage.ROUND_OF_16 },
  { code: "W91", homeRef: "W76", awayRef: "W78", stage: MatchStage.ROUND_OF_16 },
  { code: "W92", homeRef: "W79", awayRef: "W80", stage: MatchStage.ROUND_OF_16 },
  { code: "W93", homeRef: "W81", awayRef: "W82", stage: MatchStage.ROUND_OF_16 },
  { code: "W94", homeRef: "W83", awayRef: "W84", stage: MatchStage.ROUND_OF_16 },
  { code: "W95", homeRef: "W86", awayRef: "W88", stage: MatchStage.ROUND_OF_16 },
  { code: "W96", homeRef: "W85", awayRef: "W87", stage: MatchStage.ROUND_OF_16 },
];

const QUARTER_FINAL_REFS: KnockoutRef[] = [
  { code: "W97", homeRef: "W89", awayRef: "W90", stage: MatchStage.QUARTER_FINAL },
  { code: "W98", homeRef: "W93", awayRef: "W94", stage: MatchStage.QUARTER_FINAL },
  { code: "W99", homeRef: "W91", awayRef: "W92", stage: MatchStage.QUARTER_FINAL },
  { code: "W100", homeRef: "W95", awayRef: "W96", stage: MatchStage.QUARTER_FINAL },
];

const SEMI_FINAL_REFS: KnockoutRef[] = [
  { code: "W101", homeRef: "W97", awayRef: "W98", stage: MatchStage.SEMI_FINAL },
  { code: "W102", homeRef: "W99", awayRef: "W100", stage: MatchStage.SEMI_FINAL },
];

const THIRD_PLACE_REF: KnockoutRef = {
  code: "W103",
  homeRef: "W101",
  awayRef: "W102",
  stage: MatchStage.THIRD_PLACE,
};

const FINAL_REF: KnockoutRef = {
  code: "W104",
  homeRef: "W101",
  awayRef: "W102",
  stage: MatchStage.FINAL,
};

function pickWinner(teamA: TeamSeed, teamB: TeamSeed) {
  return teamA.rank < teamB.rank ? teamA : teamB;
}

function buildThirdRanking(teams: TeamSeed[]) {
  return teams
    .filter((team) => team.rank === 3)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function buildGroupRankMap(teams: TeamSeed[]) {
  const map = new Map<string, TeamSeed>();
  for (const team of teams) {
    map.set(`${team.rank}${team.group}`, team);
  }
  return map;
}

function resolveReference(
  ref: string,
  groupRankMap: Map<string, TeamSeed>,
  thirdRanking: TeamSeed[],
  usedThirds: Set<string>,
  winnersByCode: Map<string, TeamSeed>
) {
  const knownWinner = winnersByCode.get(ref);
  if (knownWinner) {
    return knownWinner;
  }

  const directGroup = groupRankMap.get(ref);
  if (directGroup) {
    return directGroup;
  }

  if (ref.startsWith("3")) {
    const allowed = new Set(ref.slice(1).split(""));
    const third = thirdRanking.find((team) => allowed.has(team.group) && !usedThirds.has(team.group));
    if (!third) {
      throw new Error(`No se pudo resolver referencia de tercero: ${ref}`);
    }
    usedThirds.add(third.group);
    return third;
  }

  throw new Error(`Referencia de cruce no soportada: ${ref}`);
}

function makeKnockoutMatch(
  ref: KnockoutRef,
  roundOrder: number,
  kickoffAt: Date,
  home: TeamSeed,
  away: TeamSeed
): SeedMatch {
  return {
    excelCode: ref.code,
    stage: ref.stage,
    group: null,
    roundOrder,
    homeCode: home.code,
    awayCode: away.code,
    homeName: home.name,
    awayName: away.name,
    kickoffAt,
    lockAt: new Date(kickoffAt.getTime() - 30 * 60 * 1000),
    bonusMultiplier: 1,
  };
}

function generateMissingKnockoutMatches(teams: TeamSeed[], existingMatches: SeedMatch[]) {
  const hasKnockout = existingMatches.some((match) => match.stage !== MatchStage.GROUP);
  if (hasKnockout) {
    return existingMatches;
  }

  const groupRankMap = buildGroupRankMap(teams);
  const thirdRanking = buildThirdRanking(teams);
  const usedThirds = new Set<string>();
  const winnersByCode = new Map<string, TeamSeed>();

  const maxKickoff = existingMatches.reduce((max, match) => (match.kickoffAt > max ? match.kickoffAt : max), new Date("2026-07-01T00:00:00.000Z"));
  const kickoffBase = new Date(maxKickoff.getTime() + 24 * 60 * 60 * 1000);
  const knockoutMatches: SeedMatch[] = [];

  const allRefs: KnockoutRef[] = [
    ...ROUND_OF_32_REFS,
    ...ROUND_OF_16_REFS,
    ...QUARTER_FINAL_REFS,
    ...SEMI_FINAL_REFS,
    THIRD_PLACE_REF,
    FINAL_REF,
  ];

  allRefs.forEach((ref, index) => {
    const home = resolveReference(ref.homeRef, groupRankMap, thirdRanking, usedThirds, winnersByCode);
    const away = resolveReference(ref.awayRef, groupRankMap, thirdRanking, usedThirds, winnersByCode);
    const winner = pickWinner(home, away);
    winnersByCode.set(ref.code, winner);

    const kickoffAt = new Date(kickoffBase.getTime() + index * 6 * 60 * 60 * 1000);
    const roundOrder = 73 + index;
    knockoutMatches.push(makeKnockoutMatch(ref, roundOrder, kickoffAt, home, away));
  });

  return [...existingMatches, ...knockoutMatches].sort((a, b) => a.roundOrder - b.roundOrder);
}

let cachedData: ParsedWorldCupData | null = null;

export function getWorldCupData(): ParsedWorldCupData {
  if (cachedData) {
    return cachedData;
  }

  const teams = dataset.teams.map((team) => ({
    code: team.code,
    name: team.name,
    flagEmoji: team.flagEmoji,
    group: team.group,
    rank: team.rank,
  } satisfies TeamSeed));

  const groups: Record<string, TeamSeed[]> = {};
  for (const team of teams) {
    if (!team.group) {
      continue;
    }

    if (!groups[team.group]) {
      groups[team.group] = [];
    }

    groups[team.group].push(team);
  }

  for (const group of Object.keys(groups)) {
    groups[group].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "es"));
  }

  const baseMatches = dataset.matches.map((match) => ({
    excelCode: match.excelCode,
    stage: match.stage as MatchStage,
    group: match.group,
    roundOrder: match.roundOrder,
    homeCode: match.homeCode,
    awayCode: match.awayCode,
    homeName: match.homeName,
    awayName: match.awayName,
    kickoffAt: new Date(match.kickoffAt),
    lockAt: new Date(match.lockAt),
    bonusMultiplier: match.bonusMultiplier,
  } satisfies SeedMatch));

  const matches = generateMissingKnockoutMatches(teams, baseMatches);

  cachedData = { groups, teams, matches };
  return cachedData;
}

export function getWorldCupGroups() {
  return getWorldCupData().groups;
}

export function getWorldCupTeams() {
  return getWorldCupData().teams;
}

export function getWorldCupMatches() {
  return getWorldCupData().matches;
}
