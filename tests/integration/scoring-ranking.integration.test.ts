import bcrypt from "bcrypt";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { MatchStage, RankingScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureLeagueScoringConfig } from "@/lib/scoring-config";
import { recalculateFinishedMatchPoints } from "@/lib/scoring-engine";
import { seedBaseWorldCupData } from "@/lib/testing/seed-data";

const passwordHashPromise = bcrypt.hash("testpass123", 10);

describe("scoring and ranking integration", () => {
  beforeAll(async () => {
    await seedBaseWorldCupData({ resetDatabase: true });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("keeps league scores isolated and computes points correctly", async () => {
    const passwordHash = await passwordHashPromise;

    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: {
          name: "League User A",
          email: "league-a@porra.test",
          passwordHash,
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          name: "League User B",
          email: "league-b@porra.test",
          passwordHash,
        },
        select: { id: true },
      }),
    ]);

    const leagueA = await prisma.league.create({
      data: {
        name: "Aislada A",
        code: "TSTA01",
        ownerId: userA.id,
        members: {
          create: [
            { userId: userA.id, role: "OWNER" },
            { userId: userB.id, role: "MEMBER" },
          ],
        },
      },
      select: { id: true },
    });

    const leagueB = await prisma.league.create({
      data: {
        name: "Aislada B",
        code: "TSTB01",
        ownerId: userB.id,
        members: {
          create: [
            { userId: userA.id, role: "MEMBER" },
            { userId: userB.id, role: "OWNER" },
          ],
        },
      },
      select: { id: true },
    });

    await ensureLeagueScoringConfig(leagueA.id);
    await ensureLeagueScoringConfig(leagueB.id);

    const matches = await prisma.match.findMany({
      where: { stage: MatchStage.GROUP },
      orderBy: { roundOrder: "asc" },
      take: 2,
      select: { id: true },
    });

    expect(matches).toHaveLength(2);

    const [matchOne, matchTwo] = matches;

    await prisma.matchPrediction.createMany({
      data: [
        {
          userId: userA.id,
          leagueId: leagueA.id,
          matchId: matchOne.id,
          predictedHome: 1,
          predictedAway: 0,
          predictedOutcome: "1",
        },
        {
          userId: userA.id,
          leagueId: leagueA.id,
          matchId: matchTwo.id,
          predictedHome: 2,
          predictedAway: 1,
          predictedOutcome: "1",
        },
        {
          userId: userB.id,
          leagueId: leagueA.id,
          matchId: matchOne.id,
          predictedHome: 0,
          predictedAway: 0,
          predictedOutcome: "X",
        },
        {
          userId: userB.id,
          leagueId: leagueA.id,
          matchId: matchTwo.id,
          predictedHome: 0,
          predictedAway: 1,
          predictedOutcome: "2",
        },
        {
          userId: userA.id,
          leagueId: leagueB.id,
          matchId: matchOne.id,
          predictedHome: 0,
          predictedAway: 1,
          predictedOutcome: "2",
        },
        {
          userId: userA.id,
          leagueId: leagueB.id,
          matchId: matchTwo.id,
          predictedHome: 1,
          predictedAway: 1,
          predictedOutcome: "X",
        },
        {
          userId: userB.id,
          leagueId: leagueB.id,
          matchId: matchOne.id,
          predictedHome: 1,
          predictedAway: 0,
          predictedOutcome: "1",
        },
        {
          userId: userB.id,
          leagueId: leagueB.id,
          matchId: matchTwo.id,
          predictedHome: 2,
          predictedAway: 1,
          predictedOutcome: "1",
        },
      ],
    });

    await prisma.match.update({
      where: { id: matchOne.id },
      data: { homeScore: 1, awayScore: 0, isFinished: true },
    });

    await prisma.match.update({
      where: { id: matchTwo.id },
      data: { homeScore: 2, awayScore: 1, isFinished: true },
    });

    await recalculateFinishedMatchPoints();

    const leagueARankings = await prisma.ranking.findMany({
      where: { leagueId: leagueA.id, scope: RankingScope.LEAGUE },
      orderBy: { rankPosition: "asc" },
      select: { userId: true, totalPoints: true, rankPosition: true },
    });

    const leagueBRankings = await prisma.ranking.findMany({
      where: { leagueId: leagueB.id, scope: RankingScope.LEAGUE },
      orderBy: { rankPosition: "asc" },
      select: { userId: true, totalPoints: true, rankPosition: true },
    });

    expect(leagueARankings[0]?.userId).toBe(userA.id);
    expect(leagueBRankings[0]?.userId).toBe(userB.id);

    const aInA = leagueARankings.find((row) => row.userId === userA.id)?.totalPoints ?? -1;
    const bInA = leagueARankings.find((row) => row.userId === userB.id)?.totalPoints ?? -1;
    const aInB = leagueBRankings.find((row) => row.userId === userA.id)?.totalPoints ?? -1;
    const bInB = leagueBRankings.find((row) => row.userId === userB.id)?.totalPoints ?? -1;

    expect(aInA).toBeGreaterThan(bInA);
    expect(bInB).toBeGreaterThan(aInB);

    const globals = await prisma.ranking.findMany({
      where: {
        scope: RankingScope.GLOBAL,
        userId: { in: [userA.id, userB.id] },
      },
      select: { userId: true, totalPoints: true },
    });

    for (const row of globals) {
      const leagueTotals = await prisma.ranking.findMany({
        where: { userId: row.userId, scope: RankingScope.LEAGUE },
        select: { totalPoints: true },
      });

      const expected = leagueTotals.reduce((acc, item) => acc + item.totalPoints, 0);
      expect(row.totalPoints).toBe(expected);
    }
  });
});
