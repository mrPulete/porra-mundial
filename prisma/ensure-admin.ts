import { prisma } from "@/lib/prisma";
import { ensureAdminUser } from "@/lib/testing/seed-data";

async function main() {
  const result = await ensureAdminUser();

  console.log("Admin verificado");
  console.log(`Admin: ${result.adminEmail}`);
  console.log("Usuario global verificado");
  console.log(`Usuario global: ${result.globalUserEmail}`);
}

main()
  .catch((error) => {
    console.error("Error asegurando admin", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });