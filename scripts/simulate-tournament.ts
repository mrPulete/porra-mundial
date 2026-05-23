import { prisma } from "@/lib/prisma";
import { runTournamentSimulation } from "@/lib/testing/tournament-simulator";

function parseArg(flag: string, fallback: number) {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  if (!arg) {
    return fallback;
  }

  const value = Number(arg.split("=")[1]);
  return Number.isFinite(value) ? value : fallback;
}

async function main() {
  const userCount = parseArg("--users", 24);
  const leagueCount = parseArg("--leagues", 4);
  const memberships = parseArg("--memberships", 2);

  const report = await runTournamentSimulation({
    userCount,
    leagueCount,
    maxMembershipsPerUser: memberships,
  });

  const hasLeagueIssues = report.leagueReports.some(
    (league) => !league.rankingsValid || league.isolationViolations > 0
  );
  const hasGlobalIssues = report.globalConsistencyChecks !== report.globalConsistencyPassed;

  console.log("=== Tournament Simulation Report ===");
  console.log(`Users: ${report.users}`);
  console.log(`Leagues: ${report.leagues}`);
  console.log(`Matches: ${report.matches}`);
  console.log(`Predictions generated: ${report.predictions}`);
  console.log(
    `Global consistency: ${report.globalConsistencyPassed}/${report.globalConsistencyChecks} users matched`
  );

  for (const league of report.leagueReports) {
    console.log(
      `${league.name}: members=${league.members}, topScore=${league.topScore}, rankingsValid=${league.rankingsValid}, isolationViolations=${league.isolationViolations}`
    );
  }

  if (hasLeagueIssues || hasGlobalIssues) {
    throw new Error("Simulation validations failed");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
