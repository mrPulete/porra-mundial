import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { runTournamentSimulation } from "@/lib/testing/tournament-simulator";

describe("tournament simulation", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("simulates multiple leagues and validates ranking consistency", async () => {
    const report = await runTournamentSimulation({
      userCount: 18,
      leagueCount: 3,
      maxMembershipsPerUser: 2,
    });

    expect(report.users).toBeGreaterThanOrEqual(19);
    expect(report.leagues).toBe(4);
    expect(report.predictions).toBeGreaterThan(0);
    expect(report.globalConsistencyChecks).toBeGreaterThan(0);
    expect(report.globalConsistencyPassed).toBe(report.globalConsistencyChecks);

    for (const league of report.leagueReports) {
      expect(league.rankingsValid).toBe(true);
      expect(league.isolationViolations).toBe(0);
      expect(league.members).toBeGreaterThan(0);
    }
  }, 120_000);
});
