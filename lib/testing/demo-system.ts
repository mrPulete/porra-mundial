import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { MatchStage, RankingScope, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureLeagueScoringConfig } from "@/lib/scoring-config";
import { outcomeFromScore, recalculateFinishedMatchPoints } from "@/lib/scoring-engine";
import { getWorldCupTeams } from "@/lib/world-cup-data";

export const DEMO_EMAIL_DOMAIN = "demo.porra.test";
export const DEMO_LEAGUE_CODE_PREFIX = "DEMO";
export const DEMO_DEFAULT_PASSWORD = "demo1234";

type TeamStrengthMap = Map<string, number>;

export type DemoLeagueSummary = {
  id: string;
  name: string;
  members: string[];
};

export type TournamentSimulationReport = {
  users: number;
  leagues: number;
  matches: number;
  predictions: number;
  leagueReports: Array<{
    leagueId: string;
    name: string;
    members: number;
    rankingsValid: boolean;
    isolationViolations: number;
    topScore: number;
  }>;
  globalConsistencyChecks: number;
  globalConsistencyPassed: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function poisson(lambda: number) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let n = 0;

  while (product > limit) {
    n += 1;
    product *= Math.random();
  }

  return n - 1;
}

function isKnockout(stage: MatchStage) {
  return stage !== MatchStage.GROUP;
}

function normalizeStrength(rank: number) {
  return clamp((33 - rank) / 32, 0.1, 1);
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return hash;
}

function buildUserProfile(userId: string) {
  const hash = hashString(userId);
  return {
    attackBias: ((hash % 11) - 5) * 0.04,
    drawBias: ((Math.floor(hash / 11) % 9) - 4) * 0.03,
    favoriteBias: ((Math.floor(hash / 97) % 11) - 5) * 0.035,
    volatility: 0.08 + (Math.floor(hash / 997) % 6) * 0.02,
  };
}

function buildScoreModel(homeStrength: number, awayStrength: number, profile?: ReturnType<typeof buildUserProfile>) {
  const favoriteBias = profile?.favoriteBias ?? 0;
  const attackBias = profile?.attackBias ?? 0;
  const drawBias = profile?.drawBias ?? 0;
  const volatility = profile?.volatility ?? 0.1;
  const strengthGap = homeStrength - awayStrength;

  const homeLambda = clamp(1.15 + strengthGap * (0.8 + favoriteBias) + 0.18 + attackBias + volatility, 0.2, 3.9);
  const awayLambda = clamp(1.0 - strengthGap * (0.72 + favoriteBias) + attackBias * 0.35 + volatility * 0.65, 0.15, 3.4);

  let home = poisson(homeLambda);
  let away = poisson(awayLambda);

  const drawAffinity = clamp(0.18 + (0.12 - Math.abs(strengthGap) * 0.14) + drawBias, 0.05, 0.4);
  if (Math.random() < drawAffinity) {
    const shared = clamp(Math.round((home + away) / 2), 0, 4);
    home = shared;
    away = shared;
  }

  return { home, away };
}

function resolveKnockoutWinner(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number, homeStrength: number, awayStrength: number) {
  if (homeScore > awayScore) {
    return homeTeamId;
  }

  if (awayScore > homeScore) {
    return awayTeamId;
  }

  const homeWeight = clamp(homeStrength + 0.08, 0.1, 1.4);
  const awayWeight = clamp(awayStrength, 0.1, 1.4);
  return Math.random() < homeWeight / (homeWeight + awayWeight) ? homeTeamId : awayTeamId;
}

async function getTeamStrengths(): Promise<TeamStrengthMap> {
  const [teams, seedTeams] = await Promise.all([
    prisma.team.findMany({ select: { id: true, code: true } }),
    Promise.resolve(getWorldCupTeams()),
  ]);

  const rankByCode = new Map(seedTeams.map((team) => [team.code, team.rank]));
  return new Map(teams.map((team) => [team.id, normalizeStrength(rankByCode.get(team.code) ?? 16)]));
}

function buildDemoLeagueCode(index: number) {
  return `${DEMO_LEAGUE_CODE_PREFIX}${String(index).padStart(2, "0")}${faker.string.alphanumeric({ length: 4, casing: "upper" })}`;
}

export function assertDemoToolsEnabled() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO_TOOLS !== "true") {
    throw new Error("Demo tools are disabled in production");
  }
}

export async function listDemoUsers() {
  return prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function generateDemoUsers(count: number) {
  assertDemoToolsEnabled();

  const passwordHash = await bcrypt.hash(DEMO_DEFAULT_PASSWORD, 10);
  const createdUsers: Array<{ id: string; email: string; name: string }> = [];

  for (let index = 0; index < count; index += 1) {
    const name = faker.person.fullName();
    const email = `${faker.internet.username().replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}.${faker.string.alphanumeric({ length: 6, casing: "lower" })}@${DEMO_EMAIL_DOMAIN}`;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: UserRole.USER,
      },
      select: { id: true, email: true, name: true },
    });

    createdUsers.push(user);
  }

  return {
    created: createdUsers.length,
    users: createdUsers,
    password: DEMO_DEFAULT_PASSWORD,
  };
}

export async function generateDemoLeagues(options: {
  ownerId: string;
  count: number;
  maxMembershipsPerUser?: number;
}) {
  assertDemoToolsEnabled();

  const maxMembershipsPerUser = options.maxMembershipsPerUser ?? 2;
  let demoUsers = await listDemoUsers();
  const minimumUsers = Math.max(options.count * Math.max(maxMembershipsPerUser, 3), 8);

  if (demoUsers.length < minimumUsers) {
    await generateDemoUsers(minimumUsers - demoUsers.length);
    demoUsers = await listDemoUsers();
  }

  const leagues: DemoLeagueSummary[] = [];

  for (let leagueIndex = 0; leagueIndex < options.count; leagueIndex += 1) {
    const members: string[] = [];

    for (let userIndex = 0; userIndex < demoUsers.length; userIndex += 1) {
      const allowMembership = (userIndex + leagueIndex) % Math.max(options.count, 1) < maxMembershipsPerUser;
      if (allowMembership) {
        members.push(demoUsers[userIndex].id);
      }
    }

    if (members.length < 4) {
      for (const user of demoUsers) {
        if (!members.includes(user.id)) {
          members.push(user.id);
        }
        if (members.length >= 4) {
          break;
        }
      }
    }

    const league = await prisma.league.create({
      data: {
        name: `Liga ${faker.location.city()} ${faker.word.adjective()}`,
        code: buildDemoLeagueCode(leagueIndex + 1),
        ownerId: options.ownerId,
        members: {
          create: members.map((userId) => ({ userId, role: "MEMBER" as const })),
        },
      },
      select: { id: true, name: true },
    });

    await ensureLeagueScoringConfig(league.id);

    leagues.push({ id: league.id, name: league.name, members });
  }

  return {
    created: leagues.length,
    leagues,
  };
}

export async function generatePredictionsForLeague(leagueId: string) {
  assertDemoToolsEnabled();

  const [league, matches, strengths] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      include: { members: { select: { userId: true } } },
    }),
    prisma.match.findMany({
      select: { id: true, stage: true, homeTeamId: true, awayTeamId: true },
      orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
    }),
    getTeamStrengths(),
  ]);

  if (!league) {
    throw new Error("League not found");
  }

  await ensureLeagueScoringConfig(league.id);
  await prisma.matchPrediction.deleteMany({ where: { leagueId } });

  const rows: Array<{
    userId: string;
    matchId: string;
    leagueId: string;
    predictedOutcome: string;
    predictedHome: number;
    predictedAway: number;
    predictedQualifiedTeamId: string | null;
    pointsAwarded: number;
    penaltyPoints: number;
  }> = [];

  for (const member of league.members) {
    const profile = buildUserProfile(member.userId);

    for (const match of matches) {
      const score = buildScoreModel(strengths.get(match.homeTeamId) ?? 0.5, strengths.get(match.awayTeamId) ?? 0.5, profile);

      rows.push({
        userId: member.userId,
        matchId: match.id,
        leagueId,
        predictedOutcome: outcomeFromScore(score.home, score.away),
        predictedHome: score.home,
        predictedAway: score.away,
        predictedQualifiedTeamId: isKnockout(match.stage)
          ? resolveKnockoutWinner(
              match.homeTeamId,
              match.awayTeamId,
              score.home,
              score.away,
              strengths.get(match.homeTeamId) ?? 0.5,
              strengths.get(match.awayTeamId) ?? 0.5
            )
          : null,
        pointsAwarded: 0,
        penaltyPoints: 0,
      });
    }
  }

  for (let index = 0; index < rows.length; index += 500) {
    await prisma.matchPrediction.createMany({ data: rows.slice(index, index + 500) });
  }

  await generateBonusAnswersForLeague(leagueId, league.members.map((member) => member.userId));

  await recalculateFinishedMatchPoints(leagueId);

  return {
    leagueId,
    members: league.members.length,
    predictions: rows.length,
  };
}

async function generateBonusAnswersForLeague(leagueId: string, userIds: string[]) {
  const questions = await prisma.bonusQuestion.findMany({
    select: { id: true, options: true },
  });

  if (questions.length === 0 || userIds.length === 0) {
    return;
  }

  await prisma.bonusAnswer.deleteMany({ where: { leagueId } });

  const rows: Array<{
    userId: string;
    questionId: string;
    leagueId: string;
    answer: string;
    pointsAwarded: number;
    penaltyPoints: number;
  }> = [];

  for (const userId of userIds) {
    for (const question of questions) {
      const options = Array.isArray(question.options)
        ? (question.options as Array<{ value?: unknown }>)
            .map((opt) => (typeof opt.value === "string" ? opt.value : null))
            .filter((v): v is string => v !== null)
        : [];

      if (options.length === 0) {
        continue;
      }

      // Elección determinista por usuario+pregunta para que la simulación sea reproducible.
      const index = hashString(userId + question.id) % options.length;
      rows.push({
        userId,
        questionId: question.id,
        leagueId,
        answer: options[index],
        pointsAwarded: 0,
        penaltyPoints: 0,
      });
    }
  }

  if (rows.length > 0) {
    await prisma.bonusAnswer.createMany({ data: rows });
  }
}

export async function generatePredictionsForLeagues(leagueIds: string[]) {
  let predictions = 0;
  for (const leagueId of leagueIds) {
    const result = await generatePredictionsForLeague(leagueId);
    predictions += result.predictions;
  }
  return { leagues: leagueIds.length, predictions };
}

async function simulateMatches(matchIds: string[]) {
  const [matches, strengths] = await Promise.all([
    prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: { id: true, stage: true, homeTeamId: true, awayTeamId: true },
      orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
    }),
    getTeamStrengths(),
  ]);

  for (const match of matches) {
    const homeStrength = strengths.get(match.homeTeamId) ?? 0.5;
    const awayStrength = strengths.get(match.awayTeamId) ?? 0.5;
    const score = buildScoreModel(homeStrength, awayStrength);

    let homeScore = score.home;
    let awayScore = score.away;

    if (isKnockout(match.stage) && homeScore === awayScore) {
      if (Math.random() < clamp(homeStrength / (homeStrength + awayStrength), 0.2, 0.8)) {
        homeScore += 1;
      } else {
        awayScore += 1;
      }
    }

    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        isFinished: true,
      },
    });
  }

  await recalculateFinishedMatchPoints();
  return { simulated: matches.length };
}

export async function simulateNextMatchday() {
  assertDemoToolsEnabled();

  const nextMatch = await prisma.match.findFirst({
    where: { isFinished: false },
    orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
    select: { kickoffAt: true },
  });

  if (!nextMatch) {
    return { simulated: 0, label: null };
  }

  const dateKey = nextMatch.kickoffAt.toISOString().slice(0, 10);
  const matches = await prisma.match.findMany({
    where: { isFinished: false },
    select: { id: true, kickoffAt: true },
    orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
  });

  const targetIds = matches.filter((match) => match.kickoffAt.toISOString().slice(0, 10) === dateKey).map((match) => match.id);
  const result = await simulateMatches(targetIds);

  return { ...result, label: dateKey };
}

export async function simulateNextRound() {
  assertDemoToolsEnabled();

  const nextMatch = await prisma.match.findFirst({
    where: { isFinished: false },
    orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
    select: { stage: true },
  });

  if (!nextMatch) {
    return { simulated: 0, label: null };
  }

  const matches = await prisma.match.findMany({
    where: {
      isFinished: false,
      stage: nextMatch.stage,
    },
    select: { id: true },
    orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
  });

  const result = await simulateMatches(matches.map((match) => match.id));
  return { ...result, label: nextMatch.stage };
}

export async function simulateTournament() {
  assertDemoToolsEnabled();

  const matches = await prisma.match.findMany({
    where: { isFinished: false },
    select: { id: true },
    orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
  });

  const result = await simulateMatches(matches.map((match) => match.id));
  return { ...result, label: "FULL_TOURNAMENT" };
}

export async function resetTournament() {
  assertDemoToolsEnabled();

  await prisma.predictionHistory.deleteMany();
  await prisma.match.updateMany({
    data: {
      homeScore: null,
      awayScore: null,
      isFinished: false,
    },
  });
  await prisma.matchPrediction.updateMany({
    data: {
      pointsAwarded: 0,
      penaltyPoints: 0,
      accuracy: null,
    },
  });
  await prisma.bonusAnswer.updateMany({
    data: {
      pointsAwarded: 0,
      penaltyPoints: 0,
    },
  });
  await prisma.ranking.updateMany({
    data: {
      totalPoints: 0,
      exactHits: 0,
      accuracy: 0,
      rankPosition: 0,
    },
  });

  return {
    resetMatches: await prisma.match.count(),
    predictions: await prisma.matchPrediction.count(),
  };
}

export async function buildSimulationReport(leagueIds: string[], createdPredictions: number): Promise<TournamentSimulationReport> {
  const leagues = await prisma.league.findMany({
    where: { id: { in: leagueIds } },
    include: { members: { select: { userId: true } } },
    orderBy: { createdAt: "asc" },
  });

  const leagueReports = [] as TournamentSimulationReport["leagueReports"];
  for (const league of leagues) {
    const rankings = await prisma.ranking.findMany({
      where: { leagueId: league.id, scope: RankingScope.LEAGUE },
      orderBy: { rankPosition: "asc" },
      select: { userId: true, rankPosition: true, totalPoints: true },
    });

    const rankingsValid = rankings.every((row, index, list) => {
      const expectedPosition = index + 1;
      const sorted = index === 0 ? true : list[index - 1].totalPoints >= row.totalPoints;
      return row.rankPosition === expectedPosition && sorted;
    });

    const violations = await prisma.matchPrediction.count({
      where: {
        leagueId: league.id,
        userId: { notIn: league.members.map((member) => member.userId) },
      },
    });

    leagueReports.push({
      leagueId: league.id,
      name: league.name,
      members: league.members.length,
      rankingsValid,
      isolationViolations: violations,
      topScore: rankings[0]?.totalPoints ?? 0,
    });
  }

  const globalRankings = await prisma.ranking.findMany({
    where: { scope: RankingScope.GLOBAL, leagueId: null },
    select: { userId: true, totalPoints: true },
  });

  let globalConsistencyChecks = 0;
  let globalConsistencyPassed = 0;

  for (const global of globalRankings) {
    const perLeague = await prisma.ranking.findMany({
      where: { userId: global.userId, scope: RankingScope.LEAGUE },
      select: { totalPoints: true },
    });

    const expected = perLeague.reduce((acc, row) => acc + row.totalPoints, 0);
    globalConsistencyChecks += 1;

    if (expected === global.totalPoints) {
      globalConsistencyPassed += 1;
    }
  }

  return {
    users: await prisma.user.count(),
    leagues: await prisma.league.count(),
    matches: await prisma.match.count(),
    predictions: createdPredictions,
    leagueReports,
    globalConsistencyChecks,
    globalConsistencyPassed,
  };
}