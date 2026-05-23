import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  generateDemoLeagues,
  generateDemoUsers,
  generatePredictionsForLeague,
  resetTournament,
  simulateNextMatchday,
  simulateNextRound,
} from "@/lib/testing/demo-system";
import { seedBaseWorldCupData } from "@/lib/testing/seed-data";

describe("demo system", () => {
  beforeAll(async () => {
    await seedBaseWorldCupData({ resetDatabase: true });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("generates demo users and leagues, creates predictions, simulates progress and resets the tournament", async () => {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    expect(admin?.id).toBeTruthy();

    const usersResult = await generateDemoUsers(6);
    expect(usersResult.created).toBe(6);

    const leaguesResult = await generateDemoLeagues({
      ownerId: admin!.id,
      count: 2,
      maxMembershipsPerUser: 2,
    });

    expect(leaguesResult.created).toBe(2);
    expect(leaguesResult.leagues[0]?.members.length).toBeGreaterThan(1);

    const predictionResult = await generatePredictionsForLeague(leaguesResult.leagues[0].id);
    expect(predictionResult.predictions).toBeGreaterThan(0);

    const matchdayResult = await simulateNextMatchday();
    expect(matchdayResult.simulated).toBeGreaterThan(0);

    const roundResult = await simulateNextRound();
    expect(roundResult.simulated).toBeGreaterThan(0);

    await resetTournament();

    const finishedMatches = await prisma.match.count({ where: { isFinished: true } });
    const nonZeroRankings = await prisma.ranking.count({ where: { totalPoints: { not: 0 } } });

    expect(finishedMatches).toBe(0);
    expect(nonZeroRankings).toBe(0);
  }, 120_000);
});