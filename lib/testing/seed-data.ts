import bcrypt from "bcrypt";
import { MatchStage, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureLeagueScoringConfig } from "@/lib/scoring-config";
import { ensureDefaultFifaBonusQuestions } from "@/lib/default-bonus-questions";
import { getWorldCupMatches, getWorldCupTeams } from "@/lib/world-cup-data";

type SeedOptions = {
  adminEmail?: string;
  adminName?: string;
  adminPassword?: string;
  resetDatabase?: boolean;
};

type EnsureAdminOptions = {
  adminEmail?: string;
  adminName?: string;
  adminPassword?: string;
};

const DEFAULT_ADMIN_EMAIL = "pulete@gmail.com";
const DEFAULT_ADMIN_NAME = "Pulete";
const DEFAULT_ADMIN_PASSWORD = "Casita10";
const DEFAULT_GLOBAL_USER_EMAIL = "jugador.global@porra.local";
const DEFAULT_GLOBAL_USER_NAME = "Jugador Global";
const DEFAULT_GLOBAL_USER_PASSWORD = "Casita10";

async function clearDatabase() {
  await prisma.predictionHistory.deleteMany();
  await prisma.matchPrediction.deleteMany();
  await prisma.bonusAnswer.deleteMany();
  await prisma.ranking.deleteMany();
  await prisma.bonusQuestion.deleteMany();
  await prisma.penaltyRule.deleteMany();
  await prisma.bonusRule.deleteMany();
  await prisma.scoringRule.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.leagueMember.deleteMany();
  await prisma.league.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.verificationToken.deleteMany();
}

export async function ensureAdminUser(options: EnsureAdminOptions = {}) {
  const adminEmail = options.adminEmail ?? DEFAULT_ADMIN_EMAIL;
  const adminName = options.adminName ?? DEFAULT_ADMIN_NAME;
  const adminPassword = options.adminPassword ?? DEFAULT_ADMIN_PASSWORD;

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      name: adminName,
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
    select: { id: true },
  });

  const globalLeague = await prisma.league.upsert({
    where: {
      code: "GLOBAL",
    },
    update: {
      name: "Liga Global",
      ownerId: admin.id,
    },
    create: {
      name: "Liga Global",
      code: "GLOBAL",
      ownerId: admin.id,
    },
    select: { id: true },
  });

  // Admin owns the league but should not participate as a prediction user.
  await prisma.leagueMember.deleteMany({
    where: {
      leagueId: globalLeague.id,
      userId: admin.id,
    },
  });

  await ensureLeagueScoringConfig(globalLeague.id);

  const globalUserPasswordHash = await bcrypt.hash(DEFAULT_GLOBAL_USER_PASSWORD, 10);

  const globalUser = await prisma.user.upsert({
    where: {
      email: DEFAULT_GLOBAL_USER_EMAIL,
    },
    update: {
      name: DEFAULT_GLOBAL_USER_NAME,
      passwordHash: globalUserPasswordHash,
      role: UserRole.USER,
    },
    create: {
      name: DEFAULT_GLOBAL_USER_NAME,
      email: DEFAULT_GLOBAL_USER_EMAIL,
      passwordHash: globalUserPasswordHash,
      role: UserRole.USER,
    },
    select: { id: true },
  });

  await prisma.leagueMember.upsert({
    where: {
      leagueId_userId: {
        leagueId: globalLeague.id,
        userId: globalUser.id,
      },
    },
    update: {
      role: "MEMBER",
    },
    create: {
      leagueId: globalLeague.id,
      userId: globalUser.id,
      role: "MEMBER",
    },
  });

  return {
    adminEmail,
    adminPassword,
    adminId: admin.id,
    globalLeagueId: globalLeague.id,
    globalUserEmail: DEFAULT_GLOBAL_USER_EMAIL,
    globalUserPassword: DEFAULT_GLOBAL_USER_PASSWORD,
    globalUserId: globalUser.id,
  };
}

export async function seedBaseWorldCupData(options: SeedOptions = {}) {
  if (options.resetDatabase ?? true) {
    await clearDatabase();
  }

  const adminResult = await ensureAdminUser(options);

  const teams = getWorldCupTeams();
  const fixtures = getWorldCupMatches();

  await prisma.team.createMany({
    data: teams.map((team) => ({
      code: team.code,
      name: team.name,
      flagEmoji: team.flagEmoji,
    })),
  });

  const dbTeams = await prisma.team.findMany({
    select: { id: true, code: true },
  });

  const teamIdByCode = new Map(dbTeams.map((team) => [team.code, team.id]));

  await prisma.match.createMany({
    data: fixtures.map((fixture) => ({
      id: `excel-${fixture.roundOrder}`,
      stage: fixture.stage as MatchStage,
      group: fixture.group,
      excelCode: fixture.excelCode,
      roundOrder: fixture.roundOrder,
      kickoffAt: fixture.kickoffAt,
      lockAt: fixture.lockAt,
      bonusMultiplier: fixture.bonusMultiplier,
      homeTeamId: teamIdByCode.get(fixture.homeCode) as string,
      awayTeamId: teamIdByCode.get(fixture.awayCode) as string,
    })),
  });

  await ensureDefaultFifaBonusQuestions();

  return {
    adminEmail: adminResult.adminEmail,
    adminPassword: adminResult.adminPassword,
    adminId: adminResult.adminId,
    globalLeagueId: adminResult.globalLeagueId,
    teams: teams.length,
    matches: fixtures.length,
    stages: Array.from(new Set(fixtures.map((fixture) => fixture.stage))),
  };
}
