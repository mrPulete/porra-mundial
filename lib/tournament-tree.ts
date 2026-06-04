import thirdPlaceCombinations from "@/data/third-place-combinations.json";

type ScoreLike = {
  home: string;
  away: string;
};

type GroupPlayedMatch = {
  group: string;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
};

export type TournamentMatchLike = {
  id: string;
  stage: string;
  group: string | null;
  code: string | null;
  kickoffAt?: Date;
  stadium?: string;
  city?: string;
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

// Cruces oficiales FIFA 2026 (Wikipedia / FIFA bracket): M97=W89/W90, M98=W93/W94,
// M99=W91/W92, M100=W95/W96. Debe coincidir con QUARTER_FINAL_REFS en world-cup-data.ts.
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

// Cableado de eliminatorias expuesto como { code: [homeRef, awayRef] } para poder
// verificar (en tests) que coincide con world-cup-data.ts y con el bracket oficial FIFA.
export const KNOCKOUT_WIRING: Record<string, [string, string]> = Object.fromEntries(
  [
    ...ROUND_OF_32_SLOTS,
    ...ROUND_OF_16_SLOTS,
    ...QUARTER_FINAL_SLOTS,
    ...SEMI_FINAL_SLOTS,
    THIRD_PLACE_SLOT,
    FINAL_SLOT,
  ].map(([code, home, away]) => [code, [home, away]])
);

// fallbackToReal=true (defecto): usa resultado oficial cuando no hay predicción (bracket board).
// fallbackToReal=false: solo usa predicciones del usuario (predictions board — Bug 3).
function getScore(match: TournamentMatchLike, liveScores?: Record<string, ScoreLike>, fallbackToReal = true) {
  const liveScore = liveScores?.[match.id];
  if (liveScore && liveScore.home !== "" && liveScore.away !== "") {
    const home = Number(liveScore.home);
    const away = Number(liveScore.away);
    if (!Number.isNaN(home) && !Number.isNaN(away)) {
      return { home, away };
    }
  }

  if (fallbackToReal && match.isFinished && match.homeScore !== null && match.awayScore !== null) {
    return { home: match.homeScore, away: match.awayScore };
  }

  return null;
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

function outcomeLoser(
  home: TeamSnapshot | null,
  away: TeamSnapshot | null,
  score: { home: number; away: number } | null,
  qualifiedTeamId?: string | null
) {
  if (!home || !away || !score) {
    return null;
  }

  if (score.home > score.away) {
    return away;
  }

  if (score.away > score.home) {
    return home;
  }

  const winner = outcomeWinner(home, away, score, qualifiedTeamId);
  if (!winner) {
    return null;
  }

  if (winner.teamId && home.teamId && winner.teamId === home.teamId) {
    return away;
  }

  if (winner.teamId && away.teamId && winner.teamId === away.teamId) {
    return home;
  }

  if (winner.name === home.name) {
    return away;
  }

  if (winner.name === away.name) {
    return home;
  }

  return null;
}

function loserCodeFromWinnerCode(code: string) {
  if (!/^W\d+$/.test(code)) {
    return null;
  }
  return `L${code.slice(1)}`;
}

function isPlaceholderLabel(label: string) {
  return /^W\d+$/.test(label) || /^L\d+$/.test(label) || /^[123][A-L]+$/.test(label) || label.startsWith("Ganador ");
}

function resolveGroupStandings(matches: TournamentMatchLike[], liveScores?: Record<string, ScoreLike>, fallbackToReal = true) {
  const rows = new Map<string, Map<string, GroupStanding>>();
  const playedGroupMatches: GroupPlayedMatch[] = [];

  for (const match of matches) {
    if (match.stage !== "GROUP" || !match.group) {
      continue;
    }

    const score = getScore(match, liveScores, fallbackToReal);
    if (!score) {
      if (!rows.has(match.group)) {
        rows.set(match.group, new Map());
      }
      const groupRows = rows.get(match.group)!;
      if (!groupRows.has(match.homeName)) {
        groupRows.set(match.homeName, {
          ...makeSnapshot(match.homeName, match.homeFlag, match.group, match.homeTeamId),
          played: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        });
      }
      if (!groupRows.has(match.awayName)) {
        groupRows.set(match.awayName, {
          ...makeSnapshot(match.awayName, match.awayFlag, match.group, match.awayTeamId),
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
        ...makeSnapshot(match.homeName, match.homeFlag, match.group, match.homeTeamId),
        played: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      } satisfies GroupStanding);

    const awayStanding =
      groupRows.get(match.awayName) ??
      ({
        ...makeSnapshot(match.awayName, match.awayFlag, match.group, match.awayTeamId),
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

    playedGroupMatches.push({
      group: match.group,
      homeName: match.homeName,
      awayName: match.awayName,
      homeScore: score.home,
      awayScore: score.away,
    });

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
    const groupMatches = playedGroupMatches.filter((item) => item.group === group);
    standings.set(
      group,
      sortGroupStandingsWithTieBreakers([...groupRows.values()], groupMatches)
    );
  }

  return standings;
}

function getFairPlayPenalty(_team: GroupStanding) {
  // TODO: conectar cuando exista fuente de tarjetas por equipo.
  return 0;
}

function getFifaRanking(_team: GroupStanding) {
  // TODO: conectar cuando exista ranking FIFA persistido por equipo.
  return Number.POSITIVE_INFINITY;
}

function sortGroupStandingsWithTieBreakers(teams: GroupStanding[], groupMatches: GroupPlayedMatch[]) {
  const groupedByPoints = new Map<number, GroupStanding[]>();

  for (const team of teams) {
    if (!groupedByPoints.has(team.points)) {
      groupedByPoints.set(team.points, []);
    }
    groupedByPoints.get(team.points)!.push(team);
  }

  const sortedPoints = [...groupedByPoints.keys()].sort((a, b) => b - a);
  const ordered: GroupStanding[] = [];

  for (const points of sortedPoints) {
    const tied = groupedByPoints.get(points) ?? [];

    if (tied.length <= 1) {
      ordered.push(...tied);
      continue;
    }

    ordered.push(...sortTiedTeams(tied, groupMatches));
  }

  return ordered;
}

function sortTiedTeams(tiedTeams: GroupStanding[], groupMatches: GroupPlayedMatch[]) {
  const nameSet = new Set(tiedTeams.map((team) => team.name));
  const headToHeadMatches = groupMatches.filter(
    (match) => nameSet.has(match.homeName) && nameSet.has(match.awayName)
  );

  const miniTable = new Map<
    string,
    {
      points: number;
      goalDifference: number;
      goalsFor: number;
    }
  >();

  for (const team of tiedTeams) {
    miniTable.set(team.name, { points: 0, goalDifference: 0, goalsFor: 0 });
  }

  for (const match of headToHeadMatches) {
    const home = miniTable.get(match.homeName);
    const away = miniTable.get(match.awayName);
    if (!home || !away) {
      continue;
    }

    home.goalsFor += match.homeScore;
    away.goalsFor += match.awayScore;
    home.goalDifference += match.homeScore - match.awayScore;
    away.goalDifference += match.awayScore - match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.points += 3;
    } else if (match.homeScore < match.awayScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  const sorted = [...tiedTeams].sort((a, b) => {
    const aMini = miniTable.get(a.name) ?? { points: 0, goalDifference: 0, goalsFor: 0 };
    const bMini = miniTable.get(b.name) ?? { points: 0, goalDifference: 0, goalsFor: 0 };

    return (
      bMini.points - aMini.points ||
      bMini.goalDifference - aMini.goalDifference ||
      bMini.goalsFor - aMini.goalsFor ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      getFairPlayPenalty(a) - getFairPlayPenalty(b) ||
      getFifaRanking(a) - getFifaRanking(b) ||
      a.name.localeCompare(b.name, "es")
    );
  });

  return sorted;
}

function resolveGroupCompletion(matches: TournamentMatchLike[], liveScores?: Record<string, ScoreLike>, fallbackToReal = true) {
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

    if (getScore(match, liveScores, fallbackToReal)) {
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
      const resolvedGroup = resolvedTeam.group?.trim().toUpperCase();

      // Buscar la posición del tercero en la ranking
      const thirdIndex = thirdRanking.findIndex((t) => t.group.trim().toUpperCase() === resolvedGroup);
      if (thirdIndex !== -1) {
        const position = thirdIndex + 1; // Convertir índice a posición (1-based)
        return `${position}° mejor tercero`;
      }

      return "3° mejor tercero";
    }

    return "3° mejor tercero";
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
  thirdAssignment: Map<string, GroupStanding>,
  liveScores?: Record<string, ScoreLike>,
  liveQualifiers?: Record<string, string>,
  fallbackToReal = true
) {
  return slots.map(([code, homeRef, awayRef]) => {
    const match = matchesByCode.get(code);

    const home = resolveSlotReference(homeRef, lookup, standings, completedGroups, allGroupsComplete, thirdAssignment);
    const away = resolveSlotReference(awayRef, lookup, standings, completedGroups, allGroupsComplete, thirdAssignment);

    const matchHome = home;
    const matchAway = away;

    const winner = match
      ? outcomeWinner(
          matchHome,
          matchAway,
          getScore(match, liveScores, fallbackToReal),
          liveQualifiers?.[match.id] ?? match.predictedQualifiedTeamId
        )
      : null;

    const loser = match
      ? outcomeLoser(
          matchHome,
          matchAway,
          getScore(match, liveScores, fallbackToReal),
          liveQualifiers?.[match.id] ?? match.predictedQualifiedTeamId
        )
      : null;

    const homeLabel = getSlotReferenceLabel(homeRef, matchHome, thirdRanking);
    const awayLabel = getSlotReferenceLabel(awayRef, matchAway, thirdRanking);
    const label = `${homeLabel} vs ${awayLabel}`;

    lookup.set(code, winner ?? null);

    const loserCode = loserCodeFromWinnerCode(code);
    if (loserCode) {
      lookup.set(loserCode, loser ?? null);
    }

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
  thirdAssignment: Map<string, GroupStanding>
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
    // Asignación de terceros precalculada (tabla oficial FIFA o emparejamiento válido).
    return thirdAssignment.get(ref) ?? null;
  }

  return null;
}

// Slots de R32 que reciben un tercero clasificado, en orden, con su lista de grupos permitidos
// (whitelist FIFA por slot, derivada de ROUND_OF_32_SLOTS).
export const THIRD_PLACE_SLOTS: Array<{ code: string; ref: string; allowed: string[] }> = [];
for (const [code, home, away] of ROUND_OF_32_SLOTS) {
  const ref = [home, away].find((value) => value.startsWith("3"));
  if (ref) {
    THIRD_PLACE_SLOTS.push({
      code,
      ref,
      allowed: ref
        .slice(1)
        .split("")
        .filter((group) => /[A-L]/.test(group)),
    });
  }
}

const THIRD_PLACE_COMBINATIONS = (thirdPlaceCombinations as { combinations?: Record<string, Record<string, string>> })
  .combinations ?? {};

// Empareja los grupos que aportan tercero con los slots de R32 respetando las whitelists.
// Backtracking determinista (slots en orden fijo, grupos en orden alfabético) ⇒ siempre devuelve
// la misma asignación válida para un mismo conjunto de grupos. Devuelve null si no hay matching.
export function matchThirdsToSlots(qualifyingGroups: string[]): Map<string, string> | null {
  const sortedGroups = [...qualifyingGroups].sort();
  const assignment = new Map<string, string>();
  const used = new Set<string>();

  const place = (index: number): boolean => {
    if (index === THIRD_PLACE_SLOTS.length) {
      return true;
    }
    const slot = THIRD_PLACE_SLOTS[index];
    for (const group of sortedGroups) {
      if (used.has(group) || !slot.allowed.includes(group)) {
        continue;
      }
      used.add(group);
      assignment.set(slot.ref, group);
      if (place(index + 1)) {
        return true;
      }
      used.delete(group);
      assignment.delete(slot.ref);
    }
    return false;
  };

  return place(0) ? assignment : null;
}

// Resuelve qué tercero (fila de ranking) juega en cada slot de R32. Prioriza la tabla oficial FIFA
// (data/third-place-combinations.json) y, si no hay entrada para esa combinación de grupos, usa el
// emparejamiento válido calculado. Recorta a los 8 mejores terceros (no 9°-12°).
function resolveThirdAssignment(thirdRanking: GroupStanding[]): Map<string, GroupStanding> {
  const result = new Map<string, GroupStanding>();
  const top8 = thirdRanking.slice(0, 8);
  if (top8.length < THIRD_PLACE_SLOTS.length) {
    return result;
  }

  const byGroup = new Map(top8.map((row) => [row.group, row]));
  const groups = top8.map((row) => row.group);
  const key = [...groups].sort().join("");

  let groupByRef: Map<string, string> | null = null;

  const officialEntry = THIRD_PLACE_COMBINATIONS[key];
  if (officialEntry) {
    const fromOfficial = new Map<string, string>();
    for (const slot of THIRD_PLACE_SLOTS) {
      const group = officialEntry[slot.code] ?? officialEntry[slot.ref];
      if (group) {
        fromOfficial.set(slot.ref, group);
      }
    }
    if (fromOfficial.size === THIRD_PLACE_SLOTS.length) {
      groupByRef = fromOfficial;
    }
  }

  if (!groupByRef) {
    groupByRef = matchThirdsToSlots(groups);
  }

  if (!groupByRef) {
    return result;
  }

  for (const [ref, group] of groupByRef) {
    const row = byGroup.get(group);
    if (row) {
      result.set(ref, row);
    }
  }

  return result;
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

export function buildGroupStandings(matches: TournamentMatchLike[], liveScores?: Record<string, ScoreLike>, fallbackToReal = true) {
  return resolveGroupStandings(matches, liveScores, fallbackToReal);
}

export function buildThirdPlaceRanking(
  matches: TournamentMatchLike[],
  liveScores?: Record<string, ScoreLike>,
  thirdGroupOrderOverride?: string[],
  fallbackToReal = true
) {
  const standings = resolveGroupStandings(matches, liveScores, fallbackToReal);
  const defaultRanking = buildThirdRankingFromStandings(standings);
  return applyThirdOrderOverride(defaultRanking, thirdGroupOrderOverride);
}

export function buildBracketTree(
  matches: TournamentMatchLike[],
  liveScores?: Record<string, ScoreLike>,
  thirdGroupOrderOverride?: string[],
  liveQualifiers?: Record<string, string>,
  fallbackToReal = true
) {
  const matchesByCode = new Map<string, TournamentMatchLike>();
  for (const match of matches) {
    if (match.code) {
      matchesByCode.set(match.code, match);
    }
  }

  const standings = resolveGroupStandings(matches, liveScores, fallbackToReal);
  const { completedGroups, allGroupsComplete } = resolveGroupCompletion(matches, liveScores, fallbackToReal);
  const defaultThirdRanking = buildThirdRankingFromStandings(standings);
  const fullThirdRanking = applyThirdOrderOverride(defaultThirdRanking, thirdGroupOrderOverride);
  // Solo los 8 mejores terceros clasifican; las etiquetas ("N° mejor tercero") y la asignación
  // a slots se calculan sobre este recorte.
  const thirdRanking = fullThirdRanking.slice(0, 8);
  const thirdAssignment = resolveThirdAssignment(fullThirdRanking);

  const lookup = new Map<string, TeamSnapshot | null>();

  const roundOf32 = buildRoundSlots(
    ROUND_OF_32_SLOTS,
    lookup,
    matchesByCode,
    standings,
    completedGroups,
    allGroupsComplete,
    thirdRanking,
    thirdAssignment,
    liveScores,
    liveQualifiers,
    fallbackToReal
  );
  const roundOf16 = buildRoundSlots(
    ROUND_OF_16_SLOTS,
    lookup,
    matchesByCode,
    standings,
    completedGroups,
    allGroupsComplete,
    thirdRanking,
    thirdAssignment,
    liveScores,
    liveQualifiers,
    fallbackToReal
  );
  const quarterFinals = buildRoundSlots(
    QUARTER_FINAL_SLOTS,
    lookup,
    matchesByCode,
    standings,
    completedGroups,
    allGroupsComplete,
    thirdRanking,
    thirdAssignment,
    liveScores,
    liveQualifiers,
    fallbackToReal
  );
  const semiFinals = buildRoundSlots(
    SEMI_FINAL_SLOTS,
    lookup,
    matchesByCode,
    standings,
    completedGroups,
    allGroupsComplete,
    thirdRanking,
    thirdAssignment,
    liveScores,
    liveQualifiers,
    fallbackToReal
  );

  const thirdPlaceMatch: BracketMatchView = {
    code: THIRD_PLACE_SLOT[0],
    label: `${getSlotReferenceLabel(THIRD_PLACE_SLOT[1], resolveSlotReference(THIRD_PLACE_SLOT[1], lookup, standings, completedGroups, allGroupsComplete, thirdAssignment), thirdRanking)} vs ${getSlotReferenceLabel(THIRD_PLACE_SLOT[2], resolveSlotReference(THIRD_PLACE_SLOT[2], lookup, standings, completedGroups, allGroupsComplete, thirdAssignment), thirdRanking)}`,
    home: resolveSlotReference(THIRD_PLACE_SLOT[1], lookup, standings, completedGroups, allGroupsComplete, thirdAssignment),
    away: resolveSlotReference(THIRD_PLACE_SLOT[2], lookup, standings, completedGroups, allGroupsComplete, thirdAssignment),
    winner: null,
  };

  const finalMatch: BracketMatchView = {
    code: FINAL_SLOT[0],
    label: `${getSlotReferenceLabel(FINAL_SLOT[1], resolveSlotReference(FINAL_SLOT[1], lookup, standings, completedGroups, allGroupsComplete, thirdAssignment), thirdRanking)} vs ${getSlotReferenceLabel(FINAL_SLOT[2], resolveSlotReference(FINAL_SLOT[2], lookup, standings, completedGroups, allGroupsComplete, thirdAssignment), thirdRanking)}`,
    home: resolveSlotReference(FINAL_SLOT[1], lookup, standings, completedGroups, allGroupsComplete, thirdAssignment),
    away: resolveSlotReference(FINAL_SLOT[2], lookup, standings, completedGroups, allGroupsComplete, thirdAssignment),
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
