import { prisma } from "@/lib/prisma";
import { seedBaseWorldCupData } from "@/lib/testing/seed-data";

async function main() {
  // resetDatabase=false preserva usuarios y ligas existentes
  const result = await seedBaseWorldCupData({ resetDatabase: false });

  console.log("Seed completado");
  console.log(`Admin: ${result.adminEmail}`);
  console.log(`Partidos: ${result.matches}`);
  console.log(`Equipos: ${result.teams}`);
}

main()
  .catch((error) => {
    console.error("Error en prisma seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
