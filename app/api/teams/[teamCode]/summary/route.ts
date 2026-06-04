import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TeamSummary = {
  name: string;
  code: string;
  flag: string;
  group: string | null;
  matchesPlayed: number;
  goalsFor: number;
  goalsConceded: number;
  lastFive: string[];
  nextMatch: {
    opponent: string;
    opponentFlag: string;
    kickoffAt: string;
    stage: string;
  } | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamCode: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { teamCode } = await params;
  const decodedTeamCode = decodeURIComponent(teamCode).trim();
  const normalizedCode = decodedTeamCode.toUpperCase().replace(/[\s-]+/g, "_");

  const team =
    (await prisma.team.findUnique({
      where: { code: normalizedCode },
      select: { id: true, name: true, code: true, flagEmoji: true },
    })) ??
    (await prisma.team.findFirst({
      where: {
        name: {
          equals: decodedTeamCode,
          mode: "insensitive",
        },
      },
      select: { id: true, name: true, code: true, flagEmoji: true },
    }));

  if (!team) {
    return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  }

  const teamMatches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    include: {
      homeTeam: { select: { id: true, name: true, flagEmoji: true } },
      awayTeam: { select: { id: true, name: true, flagEmoji: true } },
    },
    orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
  });

  const group = teamMatches.find((match) => match.stage === "GROUP" && match.group)?.group ?? null;

  const finishedMatches = teamMatches
    .filter((match) => match.isFinished && match.homeScore !== null && match.awayScore !== null)
    .sort((a, b) => b.kickoffAt.getTime() - a.kickoffAt.getTime());

  const goalsFor = finishedMatches.reduce((sum, match) => {
    const isHome = match.homeTeamId === team.id;
    return sum + (isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
  }, 0);

  const goalsConceded = finishedMatches.reduce((sum, match) => {
    const isHome = match.homeTeamId === team.id;
    return sum + (isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
  }, 0);

  const lastFive = finishedMatches.slice(0, 5).map((match) => {
    const isHome = match.homeTeamId === team.id;
    const scored = isHome ? match.homeScore ?? 0 : match.awayScore ?? 0;
    const conceded = isHome ? match.awayScore ?? 0 : match.homeScore ?? 0;
    return scored > conceded ? "W" : scored < conceded ? "L" : "D";
  });

  const nextMatch = teamMatches.find((match) => !match.isFinished) ?? null;

  const summary: TeamSummary = {
    name: team.name,
    code: team.code,
    flag: team.flagEmoji,
    group,
    matchesPlayed: finishedMatches.length,
    goalsFor,
    goalsConceded,
    lastFive,
    nextMatch: nextMatch
      ? {
          opponent: nextMatch.homeTeamId === team.id ? nextMatch.awayTeam.name : nextMatch.homeTeam.name,
          opponentFlag: nextMatch.homeTeamId === team.id ? nextMatch.awayTeam.flagEmoji : nextMatch.homeTeam.flagEmoji,
          kickoffAt: nextMatch.kickoffAt.toISOString(),
          stage: nextMatch.stage,
        }
      : null,
  };

  return NextResponse.json({ summary });
}
