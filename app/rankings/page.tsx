import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveLeagueForUser } from "@/lib/active-league";
import { RankingsTable } from "@/components/rankings-table";

export default async function RankingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Clasificación</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Necesitas iniciar sesión para ver la clasificación.</p>
        <Link href="/login" className="inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
          Entrar
        </Link>
      </main>
    );
  }

  const leagueContext = await resolveActiveLeagueForUser(session.user.id);

  if (!leagueContext.activeLeagueId) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Clasificación</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Tu sesión ya no coincide con un usuario válido. Vuelve a iniciar sesión.</p>
        <Link href="/login" className="inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
          Entrar
        </Link>
      </main>
    );
  }

  const activeLeagueId = leagueContext.activeLeagueId;

  const [rankings, averageAccuracy, finishedPredictions, totalMatches, allPredictions, pointsByRound, bonusPoints] = await Promise.all([
    prisma.ranking.findMany({
      where: {
        leagueId: activeLeagueId,
        scope: "LEAGUE",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ rankPosition: "asc" }, { totalPoints: "desc" }],
    }),
    prisma.matchPrediction.groupBy({
      by: ["userId"],
      where: {
        leagueId: activeLeagueId,
        accuracy: { not: null },
      },
      _avg: {
        accuracy: true,
      },
    }),
    prisma.matchPrediction.findMany({
      where: {
        leagueId: activeLeagueId,
        match: {
          isFinished: true,
          homeScore: { not: null },
          awayScore: { not: null },
        },
      },
      select: {
        userId: true,
        predictedHome: true,
        predictedAway: true,
        match: {
          select: {
            homeScore: true,
            awayScore: true,
          },
        },
      },
    }),
    prisma.match.count(),
    prisma.matchPrediction.findMany({
      where: {
        leagueId: activeLeagueId,
      },
      select: {
        userId: true,
        match: {
          select: {
            stage: true,
          },
        },
      },
    }),
    prisma.matchPrediction.findMany({
      where: {
        leagueId: activeLeagueId,
      },
      select: {
        userId: true,
        pointsAwarded: true,
        match: {
          select: {
            stage: true,
          },
        },
      },
    }),
    prisma.bonusAnswer.findMany({
      where: {
        leagueId: activeLeagueId,
      },
      select: {
        userId: true,
        pointsAwarded: true,
      },
    }),
  ]);

  const exactHitsByUser = new Map<string, number>();
  for (const prediction of finishedPredictions) {
    const isExact =
      prediction.match.homeScore !== null &&
      prediction.match.awayScore !== null &&
      prediction.predictedHome === prediction.match.homeScore &&
      prediction.predictedAway === prediction.match.awayScore;

    if (isExact) {
      exactHitsByUser.set(prediction.userId, (exactHitsByUser.get(prediction.userId) ?? 0) + 1);
    }
  }

  const accuracyByUser = new Map(averageAccuracy.map((row) => [row.userId, row._avg.accuracy ?? 0]));

  const predictionsByUserAndStage = new Map<string, Map<string, number>>();
  for (const pred of allPredictions) {
    if (!predictionsByUserAndStage.has(pred.userId)) {
      predictionsByUserAndStage.set(pred.userId, new Map());
    }
    const userStages = predictionsByUserAndStage.get(pred.userId)!;
    userStages.set(pred.match.stage, (userStages.get(pred.match.stage) ?? 0) + 1);
  }

  const pointsByUserAndStage = new Map<string, Map<string, number>>();
  for (const pred of pointsByRound) {
    if (!pointsByUserAndStage.has(pred.userId)) {
      pointsByUserAndStage.set(pred.userId, new Map());
    }
    const userStages = pointsByUserAndStage.get(pred.userId)!;
    userStages.set(
      pred.match.stage,
      (userStages.get(pred.match.stage) ?? 0) + (pred.pointsAwarded ?? 0),
    );
  }

  const bonusPointsByUser = new Map<string, number>();
  for (const bonus of bonusPoints) {
    bonusPointsByUser.set(bonus.userId, (bonusPointsByUser.get(bonus.userId) ?? 0) + (bonus.pointsAwarded ?? 0));
  }

  const rankingData = rankings.map((row, index) => {
    const userPredictions = allPredictions.filter((p) => p.userId === row.userId).length;
    const completionPercentage = totalMatches > 0 ? Math.round((userPredictions / totalMatches) * 100) : 0;

    return {
      position: row.rankPosition || index + 1,
      name: row.user.name || row.user.email || "Usuario",
      points: row.totalPoints,
      exactHits: exactHitsByUser.get(row.userId) ?? 0,
      accuracy: accuracyByUser.get(row.userId) ?? 0,
      completionPercentage,
      pointsByStage: pointsByUserAndStage.get(row.userId) ?? new Map(),
      bonusPoints: bonusPointsByUser.get(row.userId) ?? 0,
    };
  });

  return (
    <main className="mx-auto w-full max-w-6xl gap-4 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">Clasificación</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Puntuaciones reales de la competición.</p>
      </div>
      <RankingsTable title="Clasificación" data={rankingData} />
    </main>
  );
}
