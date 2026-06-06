import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessAdminForLeague, getLeaguesOwnedByUser } from "@/lib/league-admin";
import { getScoringSettings } from "@/lib/scoring-settings";
import { getMatchBoardData } from "@/lib/match-board-data";
import { getPredictionEditPolicy } from "@/lib/prediction-edit-policy";
import { UnifiedPredictionsBoard } from "@/components/unified-predictions-board";
import Link from "next/link";

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Cargar Resultados</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Necesitas iniciar sesión.</p>
      </main>
    );
  }

  const params = await searchParams;

  const leagues = session.user.role === "ADMIN"
    ? await prisma.league.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      })
    : await getLeaguesOwnedByUser(session.user.id);

  const activeLeagueId = params.leagueId && leagues.some((league) => league.id === params.leagueId) ? params.leagueId : leagues[0]?.id;

  if (!activeLeagueId) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Cargar Resultados</h1>
        <p className="text-neutral-600 dark:text-neutral-300">No tienes ninguna liga para administrar.</p>
      </main>
    );
  }

  const hasLeagueAccess = await canAccessAdminForLeague(session.user.id, activeLeagueId, session.user.role);
  if (!hasLeagueAccess) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Cargar Resultados</h1>
        <p className="text-neutral-600 dark:text-neutral-300">No tienes permisos para esta liga.</p>
      </main>
    );
  }

  const [scoringSettings, data, editPolicy, bonusQuestions] = await Promise.all([
    getScoringSettings(),
    getMatchBoardData({
      mode: "results",
      leagueId: activeLeagueId,
    }),
    getPredictionEditPolicy(),
    prisma.bonusQuestion.findMany({
      orderBy: [{ deadline: "asc" }, { question: "asc" }],
      select: {
        id: true,
        question: true,
        code: true,
        options: true,
        deadline: true,
        correctAnswer: true,
      },
    }),
  ]);

  const bonusData = bonusQuestions.map((question) => ({
    id: question.id,
    question: question.question,
    options: question.options,
    deadline: question.deadline.toISOString(),
    answer: typeof question.correctAnswer === "string" ? question.correctAnswer : null,
    officialAnswer: typeof question.correctAnswer === "string" ? question.correctAnswer : null,
  }));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">Cargar Resultados</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Carga los resultados oficiales por fase. Los cambios se aplicarán a todos los jugadores.
        </p>
      </div>

      {/* League Selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {leagues.map((league) => (
          <Link
            key={league.id}
            href={`/admin/resultados?leagueId=${league.id}`}
            className={`rounded-lg px-4 py-2 font-bold transition ${
              league.id === activeLeagueId
                ? "bg-emerald-700 text-white"
                : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
            }`}
          >
            {league.name}
          </Link>
        ))}
      </div>

      <div id="results-board">
        <UnifiedPredictionsBoard
          matches={data}
          bonusQuestions={bonusData}
          scoringSettings={scoringSettings}
          editPolicy={editPolicy}
          initialLastOfficialSubmittedAt={null}
          isAdminResults={true}
          leagueId={activeLeagueId}
        />
      </div>
    </main>
  );
}
