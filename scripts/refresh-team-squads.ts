import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { fetchTeamFootballData } from "../lib/football-api";
import { getWorldCupTeams } from "../lib/world-cup-data";

type JsonWithSquad = {
  squad?: unknown;
};

function getSquadSize(data: unknown): number {
  if (!data || typeof data !== "object") {
    return 0;
  }

  const squad = (data as JsonWithSquad).squad;
  return Array.isArray(squad) ? squad.length : 0;
}

async function main() {
  const forceEmpty = process.argv.includes("--force-empty");
  const teams = getWorldCupTeams();
  const teamCodes = Array.from(new Set(teams.map((team) => team.code))).sort((a, b) => a.localeCompare(b, "es"));

  let updatedWithSquad = 0;
  let updatedWithoutSquad = 0;
  let skippedPreservingCache = 0;
  let failed = 0;

  for (const teamCode of teamCodes) {
    try {
      const cached = await prisma.teamFootballData.findUnique({
        where: { teamCode },
        select: { data: true },
      });

      const cachedSquadSize = getSquadSize(cached?.data);
      const freshData = await fetchTeamFootballData(teamCode);
      const freshSquadSize = Array.isArray(freshData.squad) ? freshData.squad.length : 0;

      const shouldPersist = forceEmpty || freshSquadSize > 0 || !cached;

      if (!shouldPersist) {
        skippedPreservingCache += 1;
        console.log(`[SKIP] ${teamCode}: API sin convocados, se conserva cache (${cachedSquadSize})`);
        continue;
      }

      await prisma.teamFootballData.upsert({
        where: { teamCode },
        update: {
          data: freshData as unknown as Prisma.InputJsonValue,
          fetchedAt: new Date(),
        },
        create: {
          teamCode,
          data: freshData as unknown as Prisma.InputJsonValue,
        },
      });

      if (freshSquadSize > 0) {
        updatedWithSquad += 1;
        console.log(`[OK] ${teamCode}: convocados ${cachedSquadSize} -> ${freshSquadSize}`);
      } else {
        updatedWithoutSquad += 1;
        console.log(`[WARN] ${teamCode}: actualizado sin convocados (API vacia)`);
      }
    } catch (error) {
      failed += 1;
      console.error(`[FAIL] ${teamCode}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log("\nResumen refresco convocados");
  console.log(`- Equipos totales: ${teamCodes.length}`);
  console.log(`- Actualizados con convocados: ${updatedWithSquad}`);
  console.log(`- Actualizados sin convocados: ${updatedWithoutSquad}`);
  console.log(`- Omitidos preservando cache: ${skippedPreservingCache}`);
  console.log(`- Fallidos: ${failed}`);
}

main()
  .catch((error) => {
    console.error("Error en refresco masivo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
