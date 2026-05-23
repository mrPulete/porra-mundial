import { test, expect } from "@playwright/test";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";

const ADMIN_EMAIL = "admin@porra.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";

async function login(page: Parameters<typeof test>[0]["page"], email: string, password: string) {
  const csrfResponse = await page.request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const { csrfToken } = await csrfResponse.json();

  const callbackResponse = await page.request.post("/api/auth/callback/credentials", {
    headers: {
      "X-Auth-Return-Redirect": "1",
    },
    form: {
      csrfToken,
      email,
      password,
      callbackUrl: "/",
      json: "true",
    },
  });
  expect(callbackResponse.ok()).toBeTruthy();

  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.ok()).toBeTruthy();
  const sessionPayload = await sessionResponse.json();
  expect(sessionPayload?.user?.email).toBe(email);

  await page.goto("/");
}

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("user flow: create league and submit prediction", async ({ page, request }) => {
  const seedResponse = await request.post("/api/seed");
  expect(seedResponse.ok()).toBeTruthy();

  const email = `e2e-${Date.now()}@porra.test`;
  const password = "e2e-pass-123";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name: "E2E User",
      email,
      passwordHash,
    },
  });

  await login(page, email, password);

  const createLeagueResponse = await page.request.post("/api/leagues", {
    data: { name: "Liga E2E" },
  });
  expect(createLeagueResponse.status()).toBe(201);

  const createLeaguePayload = await createLeagueResponse.json();
  expect(createLeaguePayload.ok).toBeTruthy();

  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });

  const match = await prisma.match.findFirstOrThrow({
    orderBy: { roundOrder: "asc" },
    select: { id: true },
  });

  const predictionResponse = await page.request.post("/api/predictions", {
    data: {
      predictions: [
        {
          matchId: match.id,
          homeScore: 2,
          awayScore: 1,
        },
      ],
    },
  });

  expect(predictionResponse.status()).toBe(200);
  const predictionPayload = await predictionResponse.json();
  expect(predictionPayload.ok).toBeTruthy();

  const prediction = await prisma.matchPrediction.findUnique({
    where: {
      userId_matchId_leagueId: {
        userId: user.id,
        matchId: match.id,
        leagueId: createLeaguePayload.league.id,
      },
    },
  });

  expect(prediction).not.toBeNull();
});

test("admin flow: upload results and trigger recalculation", async ({ page, request }) => {
  const seedResponse = await request.post("/api/seed");
  expect(seedResponse.ok()).toBeTruthy();

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  const matches = await prisma.match.findMany({
    orderBy: { roundOrder: "asc" },
    take: 2,
    select: { id: true },
  });

  const saveResultsResponse = await page.request.post("/api/admin/results", {
    data: {
      results: [
        { matchId: matches[0].id, homeScore: 1, awayScore: 0 },
        { matchId: matches[1].id, homeScore: 2, awayScore: 1 },
      ],
    },
  });

  expect(saveResultsResponse.status()).toBe(200);
  const saveResultsPayload = await saveResultsResponse.json();
  expect(saveResultsPayload.ok).toBeTruthy();

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  const ranking = await prisma.ranking.findFirst({
    where: {
      userId: admin.id,
      scope: "GLOBAL",
      leagueId: null,
    },
    select: { totalPoints: true },
  });

  expect(ranking).not.toBeNull();
  expect(ranking?.totalPoints ?? 0).toBeGreaterThanOrEqual(0);

  const finishedMatches = await prisma.match.count({
    where: {
      id: { in: matches.map((match) => match.id) },
      isFinished: true,
    },
  });

  expect(finishedMatches).toBe(2);
});
