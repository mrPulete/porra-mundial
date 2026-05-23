import { prisma } from "@/lib/prisma";
import { seedBaseWorldCupData } from "@/lib/testing/seed-data";
import {
  buildSimulationReport,
  generateDemoLeagues,
  generateDemoUsers,
  generatePredictionsForLeagues,
  simulateTournament,
} from "@/lib/testing/demo-system";
import type { TournamentSimulationReport } from "@/lib/testing/demo-system";

type SimulatorOptions = {
  userCount?: number;
  leagueCount?: number;
  maxMembershipsPerUser?: number;
};

export type { TournamentSimulationReport } from "@/lib/testing/demo-system";

export async function runTournamentSimulation(options: SimulatorOptions = {}): Promise<TournamentSimulationReport> {
  const userCount = options.userCount ?? 24;
  const leagueCount = options.leagueCount ?? 4;
  const maxMembershipsPerUser = options.maxMembershipsPerUser ?? 2;

  if (maxMembershipsPerUser > leagueCount) {
    throw new Error("maxMembershipsPerUser cannot be greater than leagueCount");
  }

  await seedBaseWorldCupData({ resetDatabase: true });
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!admin) {
    throw new Error("Seed admin user not found");
  }

  await generateDemoUsers(userCount);
  const leagueResult = await generateDemoLeagues({
    ownerId: admin.id,
    count: leagueCount,
    maxMembershipsPerUser,
  });
  const predictionResult = await generatePredictionsForLeagues(leagueResult.leagues.map((league) => league.id));
  await simulateTournament();

  return buildSimulationReport(leagueResult.leagues.map((league) => league.id), predictionResult.predictions);
}
