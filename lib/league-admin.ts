import { prisma } from "@/lib/prisma";

export async function getLeaguesOwnedByUser(userId: string) {
  return prisma.league.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
  });
}

export async function userOwnsLeague(userId: string, leagueId: string) {
  const league = await prisma.league.findFirst({
    where: { id: leagueId, ownerId: userId },
    select: { id: true },
  });

  return Boolean(league);
}

export async function canAccessAdminForLeague(userId: string, leagueId: string, role?: string | null) {
  if (role === "ADMIN") {
    return true;
  }

  return userOwnsLeague(userId, leagueId);
}