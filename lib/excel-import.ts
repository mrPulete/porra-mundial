import { prisma } from "@/lib/prisma";
import { getWorldCupMatches, getWorldCupTeams } from "@/lib/world-cup-data";

export async function importMatchesFromAdminExcel() {
  const knownTeams = new Map(getWorldCupTeams().map((team) => [team.name, team]));
  const parsedMatches = getWorldCupMatches();

  await prisma.matchPrediction.deleteMany();
  await prisma.ranking.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();

  for (const match of parsedMatches) {
    const homeTeam = knownTeams.get(match.homeName);
    const awayTeam = knownTeams.get(match.awayName);

    if (!homeTeam || !awayTeam) {
      throw new Error(`No se pudo resolver metadata para ${match.homeName} vs ${match.awayName}`);
    }

    const existingHome = await prisma.team.findFirst({
      where: {
        OR: [{ code: homeTeam.code }, { name: homeTeam.name }],
      },
      select: { id: true },
    });

    const home = existingHome
      ? await prisma.team.update({
          where: { id: existingHome.id },
          data: {
            code: homeTeam.code,
            name: homeTeam.name,
            flagEmoji: homeTeam.flagEmoji,
          },
        })
      : await prisma.team.create({
          data: {
            code: homeTeam.code,
            name: homeTeam.name,
            flagEmoji: homeTeam.flagEmoji,
          },
        });

    const existingAway = await prisma.team.findFirst({
      where: {
        OR: [{ code: awayTeam.code }, { name: awayTeam.name }],
      },
      select: { id: true },
    });

    const away = existingAway
      ? await prisma.team.update({
          where: { id: existingAway.id },
          data: {
            code: awayTeam.code,
            name: awayTeam.name,
            flagEmoji: awayTeam.flagEmoji,
          },
        })
      : await prisma.team.create({
          data: {
            code: awayTeam.code,
            name: awayTeam.name,
            flagEmoji: awayTeam.flagEmoji,
          },
        });

    await prisma.match.create({
      data: {
        id: `excel-${match.roundOrder}`,
        stage: match.stage,
        group: match.group,
        excelCode: match.excelCode,
        kickoffAt: match.kickoffAt,
        lockAt: new Date(match.kickoffAt.getTime() - 30 * 60 * 1000),
        bonusMultiplier: match.bonusMultiplier,
        homeTeamId: home.id,
        awayTeamId: away.id,
        roundOrder: match.roundOrder,
      },
    });
  }

  return {
    importedMatches: parsedMatches.length,
  };
}
