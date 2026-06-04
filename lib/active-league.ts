import { prisma } from "@/lib/prisma";

type UserLeague = {
  id: string;
  name: string;
  code: string;
};
export async function resolveActiveLeagueForUser(userId: string): Promise<{ userLeagues: UserLeague[]; activeLeagueId: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  // Sesion invalida (usuario borrado o recreado): evitamos FK errors y dejamos al caller manejar relogin.
  if (!user) {
    return {
      userLeagues: [],
      activeLeagueId: null,
    };
  }

  let globalLeague = await prisma.league.findUnique({
    where: { code: "GLOBAL" },
    select: { id: true, name: true, code: true },
  });

  if (!globalLeague) {
    globalLeague = await prisma.league.create({
      data: {
        code: "GLOBAL",
        name: "Global",
        ownerId: user.id,
      },
      select: { id: true, name: true, code: true },
    });
  }

  await prisma.leagueMember.upsert({
    where: {
      leagueId_userId: {
        leagueId: globalLeague.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      leagueId: globalLeague.id,
      role: "MEMBER",
    },
  });

  return {
    userLeagues: [globalLeague],
    activeLeagueId: globalLeague.id,
  };
}