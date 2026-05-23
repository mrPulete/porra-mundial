import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ACTIVE_LEAGUE_COOKIE = "activeLeagueId";

type UserLeague = {
  id: string;
  name: string;
  code: string;
};
export async function resolveActiveLeagueForUser(userId: string): Promise<{ userLeagues: UserLeague[]; activeLeagueId: string | null }> {
  // Get leagueId from query param if present
  const headersList = await headers();
  const url = headersList.get("x-url") || headersList.get("referer") || "";
  let queryLeagueId: string | null = null;
  try {
    const u = new URL(url, "http://localhost");
    queryLeagueId = u.searchParams.get("leagueId");
  } catch {}

  const userLeagues = await prisma.league.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true, name: true, code: true },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
  });

  if (userLeagues.length === 0) {
    return { userLeagues, activeLeagueId: null };
  }

  const cookieStore = await cookies();
  const cookieLeagueId = cookieStore.get(ACTIVE_LEAGUE_COOKIE)?.value;
  const validQueryLeague = queryLeagueId && userLeagues.some((league) => league.id === queryLeagueId) ? queryLeagueId : null;
  const validCookieLeague = cookieLeagueId && userLeagues.some((league) => league.id === cookieLeagueId) ? cookieLeagueId : null;

  return {
    userLeagues,
    activeLeagueId: validQueryLeague ?? validCookieLeague ?? userLeagues[0].id,
  };
}