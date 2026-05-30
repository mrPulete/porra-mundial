import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveLeagueForUser } from "@/lib/active-league";
import { ActiveLeagueHero } from "@/components/active-league-hero";
import { RankingsTable } from "@/components/rankings-table";

export default async function RankingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Clasificación</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Necesitas iniciar sesión para ver la clasificación de tu liga activa.</p>
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
        <p className="text-neutral-600 dark:text-neutral-300">No tienes ninguna liga activa seleccionada.</p>
      </main>
    );
  }

  const activeLeagueId = leagueContext.activeLeagueId;

  const [league, rankings, averageAccuracy, finishedPredictions] = await Promise.all([
    prisma.league.findUnique({
      where: { id: activeLeagueId },
      select: { id: true, name: true, code: true },
    }),
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

  const leagueData = rankings.map((row, index) => ({
    position: row.rankPosition || index + 1,
    name: row.user.name || row.user.email || "Usuario",
    points: row.totalPoints,
    exactHits: exactHitsByUser.get(row.userId) ?? 0,
    accuracy: accuracyByUser.get(row.userId) ?? 0,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl gap-4 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">Clasificación</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          {league ? `Puntuaciones reales de la liga activa: ${league.name} (${league.code}).` : "Puntuaciones reales de tu liga activa."}
        </p>
      </div>
      {league && (
        <ActiveLeagueHero
          name={league.name}
          code={league.code}
          description="Este es el código de tu liga activa. Compártelo para que tus amigos puedan unirse y aparecer en esta clasificación."
        />
      )}
      <RankingsTable title={league ? `Liga ${league.name}` : "Clasificación de liga"} data={leagueData} />
    </main>
  );
}
