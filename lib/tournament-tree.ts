type ScoreLike = {
  home: string;
  away: string;
};

export type TournamentMatchLike = {
  id: string;
  stage: string;
  group: string | null;
  code: string | null;
  homeName: string;
  homeFlag: string;
  homeTeamId?: string;
  awayName: string;
  awayFlag: string;
  awayTeamId?: string;
  isFinished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  predictedQualifiedTeamId?: string | null;
};

export type TeamSnapshot = {
  name: string;
  flag: string;
  group: string;
  teamId?: string;
};

export type GroupStanding = TeamSnapshot & {
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type ThirdPlaceStanding = GroupStanding;

export type BracketMatchView = {
  code: string;
  label: string;
  home: TeamSnapshot | null;
  away: TeamSnapshot | null;
  winner: TeamSnapshot | null;
};

export type BracketRoundView = {
  key: string;
  label: string;
  matches: BracketMatchView[];
};

const ROUND_OF_32_SLOTS = [
  ["W73", "2A", "2B"],
  ["W74", "1E", "3ABCDF"],
  ["W75", "1F", "2C"],
  ["W76", "1C", "2F"],
  ["W77", "1I", "3CDFGH"],
  ["W78", "2E", "2I"],
  ["W79", "1A", "3CEFHI"],
  ["W80", "1L", "3EHIJK"],
  ["W81", "1D", "3BEFIJ"],
  ["W82", "1G", "3AEHIJ"],
  ["W83", "2K", "2L"],
  ["W84", "1H", "2J"],
  ["W85", "1B", "3EFGIJ"],
  ["W86", "1J", "2H"],
  ["W87", "1K", "3DEIJL"],
  ["W88", "2D", "2G"],
] as const;

const ROUND_OF_16_SLOTS = [
  ["W89", "W73", "W75"],
  ["W90", "W74", "W77"],
  ["W91", "W76", "W78"],
  ["W92", "W79", "W80"],
  ["W93", "W81", "W82"],
  ["W94", "W83", "W84"],
  ["W95", "W86", "W88"],
  ["W96", "W85", "W87"],
] as const;

const QUARTER_FINAL_SLOTS = [
  ["W97", "W89", "W90"],
  ["W98", "W93", "W94"],
  ["W99", "W91", "W92"],
  ["W100", "W95", "W96"],
] as const;

const SEMI_FINAL_SLOTS = [
  ["W101", "W97", "W98"],
  ["W102", "W99", "W100"],
] as const;

const THIRD_PLACE_SLOT = ["W103", "L101", "L102"] as const;
const FINAL_SLOT = ["W104", "W101", "W102"] as const;

function getScore(match: TournamentMatchLike, liveScores?: Record<string, ScoreLike>) {
  if (match.isFinished && match.homeScore !== null && match.awayScore !== null) {
    return { home: match.homeScore, away: match.awayScore };
  }

  const liveScore = liveScores?.[match.id];
  if (!liveScore || liveScore.home === "" || liveScore.away === "") {
    return null;
  }

  const home = Number(liveScore.home);
  const away = Number(liveScore.away);
  if (Number.isNaN(home) || Number.isNaN(away)) {
    return null;
  }

  return { home, away };
}

function makeSnapshot(name: string, flag: string, group: string, teamId?: string) {
  return { name, flag, group, teamId } satisfies TeamSnapshot;
}

function outcomeWinner(
  home: TeamSnapshot | null,
  away: TeamSnapshot | null,
  score: { home: number; away: number } | null,
  qualifiedTeamId?: string | null
) {
  if (!home || !away || !score || score.home === score.away) {
    if (!home || !away || !score || score.home !== score.away || !qualifiedTeamId) {
      return null;
    }

    if (home.teamId === qualifiedTeamId) {
      return home;
    }

    if (away.teamId === qualifiedTeamId) {
      return away;
    }

    return null;
  }

  return score.home > score.away ? home : away;
}

function isPlaceholderLabel(label: string) {
  return /^W\d+$/.test(label) || /^L\d+$/.test(label) || /^[123][A-L]+$/.test(label) || label.startsWith("Ganador ");
}

function resolveGroupStandings(matches: TournamentMatchLike[], liveScores?: Record<string, ScoreLike>) {
  const rows = new Map<string, Map<string, GroupStanding>>();

  for (const match of matches) {
    if (match.stage !== "GROUP" || !match.group) {
      continue;
    }

    const score = getScore(match, liveScores);
    if (!score) {
      if (!rows.has(match.group)) {
        rows.set(match.group, new Map());
      }
      const groupRows = rows.get(match.group)!;
      if (!groupRows.has(match.homeName)) {
        groupRows.set(match.homeName, {
          ...makeSnapshot(match.homeName, match.homeFlag, match.group),
          played: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        });
      }
      if (!groupRows.has(match.awayName)) {
        groupRows.set(match.awayName, {
          ...makeSnapshot(match.awayName, match.awayFlag, match.group),
          played: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        });
      }
      continue;
    }

    if (!rows.has(match.group)) {
      rows.set(match.group, new Map());
    }

    const groupRows = rows.get(match.group)!;

    const homeStanding =
      groupRows.get(match.homeName) ??
      ({
        ...makeSnapshot(match.homeName, match.homeFlag, match.group),
        played: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      } satisfies GroupStanding);

    const awayStanding =
      groupRows.get(match.awayName) ??
      ({
        ...makeSnapshot(match.awayName, match.awayFlag, match.group),
        played: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      } satisfies GroupStanding);

    homeStanding.played += 1;
    awayStanding.played += 1;
    homeStanding.goalsFor += score.home;
    homeStanding.goalsAgainst += score.away;
    awayStanding.goalsFor += score.away;
    awayStanding.goalsAgainst += score.home;
    homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
    awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;

    if (score.home > score.away) {
      homeStanding.points += 3;
    } else if (score.home < score.away) {
      awayStanding.points += 3;
    } else {
      homeStanding.points += 1;
      awayStanding.points += 1;
    }

    groupRows.set(match.homeName, homeStanding);
    groupRows.set(match.awayName, awayStanding);
  }

  const standings = new Map<string, GroupStanding[]>();
  for (const [group, groupRows] of rows.entries()) {
    standings.set(
      group,
      [...groupRows.values()].sort(
        (a, b) =>
          b.points - a.points ||
          b.goalDifference - a.goalDifference ||
          b.goalsFor - a.goalsFor ||
          a.name.localeCompare(b.name, "es")
      )
    );
  }

  return standings;
}

function resolveGroupCompletion(matches: TournamentMatchLike[], liveScores?: Record<string, ScoreLike>) {
  const progress = new Map<string, { total: number; finished: number }>();

  for (const match of matches) {
    if (match.stage !== "GROUP" || !match.group) {
      continue;
    }

    if (!progress.has(match.group)) {
      progress.set(match.group, { total: 0, finished: 0 });
    }

    const row = progress.get(match.group)!;
    row.total += 1;

    if (getScore(match, liveScores)) {
      row.finished += 1;
    }
  }

  const completed = new Set<string>();
  for (const [group, row] of progress.entries()) {
    if (row.total > 0 && row.finished >= row.total) {
      completed.add(group);
    }
  }

  return { completedGroups: completed, allGroupsComplete: progress.size > 0 && completed.size === progress.size };
}

/**
 * Convierte una referencia de slot a una etiqueta amigable
 * Ejemplos:
 * - "1A" → "1° Grupo A"
 * - "2B" → "2° Grupo B"
 * - "W73" → "Ganador W73"
 * - "3ABCDF" con team.group="C" → "4° mejor tercero"
 */
function getSlotReferenceLabel(
  ref: string,
  resolvedTeam: TeamSnapshot | null,
  thirdRanking: GroupStanding[] = []
): string {
  // Referencias de grupo: 1A, 2B, etc.
  const groupMatch = ref.match(/^([12])([A-L])$/);
  if (groupMatch) {
    const position = groupMatch[1] === "1" ? "1°" : "2°";
    const group = groupMatch[2];
    return `${position} Grupo ${group}`;
  }

  // Referencias de terceros: 3ABCDF, etc.
  if (ref.startsWith("3")) {
    if (resolvedTeam) {
      // Buscar la posición del tercero en la ranking
      const thirdIndex = thirdRanking.findIndex((t) => t.group === resolvedTeam.group);
      if (thirdIndex !== -1) {
        const position = thirdIndex + 1; // Convertir índice a posición (1-based)
        return `${position}° mejor tercero`;
      }
      return `3° Mejor (${resolvedTeam.group})`;
    }
    return `3° Mejor`;
  }

  // Referencias de matches previos: W73, W74, etc.
  if (ref.startsWith("W")) {
    return `Ganador ${ref}`;
  }

  return ref;
}

function buildRoundSlots(
  slots: readonly (readonly [string, string, string])[],
  lookup: Map<string, TeamSnapshot | null>,
  matchesByCode: Map<string, TournamentMatchLike>,
  standings: Map<string, GroupStanding[]>,
  completedGroups: Set<string>,
  allGroupsComplete: boolean,
  thirdRanking: GroupStanding[],
  usedThirds: Set<string>,
  liveScores?: Record<string, ScoreLike>,
  liveQualifiers?: Record<string, string>
) {
  return slots.map(([code, homeRef, awayRef]) => {
    const match = matchesByCode.get(code);

    const home = resolveSlotReference(homeRef, lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds);
    const away = resolveSlotReference(awayRef, lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds);

    // Prefer dynamic resolution (group standings / third order / previous winners).
    // If not available, fall back to static DB teams so admin bracket can still render advanced rounds.
    const staticHome =
      match && !isPlaceholderLabel(match.homeName)
        ? makeSnapshot(match.homeName, match.homeFlag, match.group || "", match.homeTeamId)
        : null;
    const staticAway =
      match && !isPlaceholderLabel(match.awayName)
        ? makeSnapshot(match.awayName, match.awayFlag, match.group || "", match.awayTeamId)
        : null;

    const matchHome = home ?? staticHome;
    const matchAway = away ?? staticAway;

    const winner = match
      ? outcomeWinner(
          matchHome,
          matchAway,
          getScore(match, liveScores),
          liveQualifiers?.[match.id] ?? match.predictedQualifiedTeamId
        )
      : null;

    const homeLabel = getSlotReferenceLabel(homeRef, matchHome, thirdRanking);
    const awayLabel = getSlotReferenceLabel(awayRef, matchAway, thirdRanking);
    const label = `${homeLabel} vs ${awayLabel}`;

    lookup.set(code, winner ?? null);

    return {
      code,
      label,
      home: matchHome,
      away: matchAway,
      winner,
    } satisfies BracketMatchView;
  });
}

function resolveSlotReference(
  ref: string,
  lookup: Map<string, TeamSnapshot | null>,
  standings: Map<string, GroupStanding[]>,
  completedGroups: Set<string>,
  allGroupsComplete: boolean,
  thirdRanking: GroupStanding[],
  usedThirds: Set<string>
) {
  const direct = lookup.get(ref);
  if (direct) {
    return direct;
  }

  const directGroup = ref.match(/^([12])([A-L])$/);
  if (directGroup) {
    const position = Number(directGroup[1]);
    const group = directGroup[2];
    if (!completedGroups.has(group)) {
      return null;
    }
    return standings.get(group)?.[position - 1] ?? null;
  }

  if (ref.startsWith("3")) {
    if (!allGroupsComplete) {
      return null;
    }

    const allowedGroups = ref
      .slice(1)
      .split("")
      .filter((group) => /[A-L]/.test(group));

    for (const row of thirdRanking) {
      if (usedThirds.has(row.group)) {
        continue;
      }

      if (allowedGroups.includes(row.group)) {
        usedThirds.add(row.group);
        return row;
      }
    }
  }

  return null;
}

function buildThirdRankingFromStandings(standings: Map<string, GroupStanding[]>) {
  return [...standings.entries()]
    .flatMap(([group, rows]) => rows.slice(2, 3).map((row) => ({ ...row, group })))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.name.localeCompare(b.name, "es")
    );
}

function applyThirdOrderOverride(thirdRanking: ThirdPlaceStanding[], thirdGroupOrderOverride?: string[]) {
  if (!thirdGroupOrderOverride || thirdGroupOrderOverride.length === 0) {
    return thirdRanking;
  }

  const byGroup = new Map(thirdRanking.map((row) => [row.group, row]));
  const ordered: ThirdPlaceStanding[] = [];

  for (const group of thirdGroupOrderOverride) {
    const row = byGroup.get(group);
    if (row) {
      ordered.push(row);
      byGroup.delete(group);
    }
  }

  for (const row of thirdRanking) {
    const remaining = byGroup.get(row.group);
    if (remaining) {
      ordered.push(remaining);
      byGroup.delete(row.group);
    }
  }

  return ordered;
}

export function buildGroupStandings(matches: TournamentMatchLike[], liveScores?: Record<string, ScoreLike>) {
  return resolveGroupStandings(matches, liveScores);
}

export function buildThirdPlaceRanking(
  matches: TournamentMatchLike[],
  liveScores?: Record<string, ScoreLike>,
  thirdGroupOrderOverride?: string[]
) {
  const standings = resolveGroupStandings(matches, liveScores);
  const defaultRanking = buildThirdRankingFromStandings(standings);
  return applyThirdOrderOverride(defaultRanking, thirdGroupOrderOverride);
}

export function buildBracketTree(
  matches: TournamentMatchLike[],
  liveScores?: Record<string, ScoreLike>,
  thirdGroupOrderOverride?: string[],
  liveQualifiers?: Record<string, string>
) {
  const matchesByCode = new Map<string, TournamentMatchLike>();
  for (const match of matches) {
    if (match.code) {
      matchesByCode.set(match.code, match);
    }
  }

  const standings = resolveGroupStandings(matches, liveScores);
  const { completedGroups, allGroupsComplete } = resolveGroupCompletion(matches, liveScores);
  const defaultThirdRanking = buildThirdRankingFromStandings(standings);
  const thirdRanking = applyThirdOrderOverride(defaultThirdRanking, thirdGroupOrderOverride);

  const usedThirds = new Set<string>();
  const lookup = new Map<string, TeamSnapshot | null>();

  const roundOf32 = buildRoundSlots(
    ROUND_OF_32_SLOTS,
    lookup,
    matchesByCode,
    standings,
    completedGroups,
    allGroupsComplete,
    thirdRanking,
    usedThirds,
    liveScores,
    liveQualifiers
  );
  const roundOf16 = buildRoundSlots(
    ROUND_OF_16_SLOTS,
    lookup,
    matchesByCode,
    standings,
    completedGroups,
    allGroupsComplete,
    thirdRanking,
    usedThirds,
    liveScores,
    liveQualifiers
  );
  const quarterFinals = buildRoundSlots(
    QUARTER_FINAL_SLOTS,
    lookup,
    matchesByCode,
    standings,
    completedGroups,
    allGroupsComplete,
    thirdRanking,
    usedThirds,
    liveScores,
    liveQualifiers
  );
  const semiFinals = buildRoundSlots(
    SEMI_FINAL_SLOTS,
    lookup,
    matchesByCode,
    standings,
    completedGroups,
    allGroupsComplete,
    thirdRanking,
    usedThirds,
    liveScores,
    liveQualifiers
  );

  const thirdPlaceMatch: BracketMatchView = {
    code: THIRD_PLACE_SLOT[0],
    label: `${getSlotReferenceLabel(THIRD_PLACE_SLOT[1], resolveSlotReference(THIRD_PLACE_SLOT[1], lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds), thirdRanking)} vs ${getSlotReferenceLabel(THIRD_PLACE_SLOT[2], resolveSlotReference(THIRD_PLACE_SLOT[2], lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds), thirdRanking)}`,
    home: resolveSlotReference(THIRD_PLACE_SLOT[1], lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds),
    away: resolveSlotReference(THIRD_PLACE_SLOT[2], lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds),
    winner: null,
  };

  const finalMatch: BracketMatchView = {
    code: FINAL_SLOT[0],
    label: `${getSlotReferenceLabel(FINAL_SLOT[1], resolveSlotReference(FINAL_SLOT[1], lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds), thirdRanking)} vs ${getSlotReferenceLabel(FINAL_SLOT[2], resolveSlotReference(FINAL_SLOT[2], lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds), thirdRanking)}`,
    home: resolveSlotReference(FINAL_SLOT[1], lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds),
    away: resolveSlotReference(FINAL_SLOT[2], lookup, standings, completedGroups, allGroupsComplete, thirdRanking, usedThirds),
    winner: null,
  };

  const rounds: BracketRoundView[] = [
    { key: "round_of_32", label: "32avos", matches: roundOf32 },
    { key: "round_of_16", label: "16avos", matches: roundOf16 },
    { key: "quarter_final", label: "Cuartos", matches: quarterFinals },
    { key: "semi_final", label: "Semis", matches: semiFinals },
    { key: "third_place", label: "3er puesto", matches: [thirdPlaceMatch] },
    { key: "final", label: "Final", matches: [finalMatch] },
  ];

  return { rounds, standings };
}
