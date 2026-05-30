import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveLeagueForUser } from "@/lib/active-league";
import { getScoringSettings } from "@/lib/scoring-settings";
import { getMatchBoardData } from "@/lib/match-board-data";
import { ActiveLeagueHero } from "@/components/active-league-hero";
import { UnifiedPredictionsBoard } from "@/components/unified-predictions-board";

export default async function PredictionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Pronósticos</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Necesitas iniciar sesión para enviar tus pronósticos.</p>
        <Link href="/login" className="inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
          Ir a login
        </Link>
      </main>
    );
  }

  if (session.user.role === "ADMIN") {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Pronósticos</h1>
        <section className="rounded-3xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-neutral-900/70">
          <p className="text-sm font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Cuenta Admin</p>
          <h2 className="mt-1 text-xl font-black">El admin no participa en la porra</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Esta cuenta está reservada para gestión. Usa la vista de Admin para revisar usuarios, resultados y bloqueos por ronda.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin" className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
              Ir a Admin
            </Link>
            <Link href="/matches" className="rounded-xl border border-black/10 bg-white px-4 py-2 font-bold dark:border-white/10 dark:bg-neutral-900">
              Ver Resultados
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const leagueContext = await resolveActiveLeagueForUser(session.user.id);

  if (!leagueContext.activeLeagueId) {
    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
        <h1 className="text-3xl font-black">Pronósticos</h1>
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-800/60 dark:bg-emerald-900/20">
          <h2 className="text-2xl font-black">Bienvenido a la Porra del Mundial</h2>
          <p className="mt-2 text-neutral-700 dark:text-neutral-200">Todavía no estás en una liga. Te guiamos para arrancar sin perderte:</p>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-200">
            <li>Únete o crea una liga</li>
            <li>Completa tus pronósticos de fase de grupos y eliminatorias</li>
            <li>Compite en el ranking con tu liga</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/leagues" className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
              Empezar en Ligas
            </Link>
            <Link href="/rankings" className="rounded-xl bg-neutral-900 px-4 py-2 font-bold text-white dark:bg-neutral-100 dark:text-black">
              Ver Ranking
            </Link>
            <Link href="/matches" className="rounded-xl border border-black/10 bg-white px-4 py-2 font-bold dark:border-white/10 dark:bg-neutral-900">
              Explorar Partidos
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const activeLeagueId = leagueContext.activeLeagueId;
  const activeLeague = leagueContext.userLeagues.find((league) => league.id === activeLeagueId);

  const [scoringSettings, data, predictionsCount] = await Promise.all([
    getScoringSettings(),
    getMatchBoardData({
      mode: "predictions",
      userId: session.user.id,
      leagueId: activeLeagueId,
    }),
    prisma.matchPrediction.count({
      where: {
        userId: session.user.id,
        leagueId: activeLeagueId,
      },
    }),
  ]);

  const [leagueDraft, latestOfficialSubmission] = await Promise.all([
    prisma.userLeagueDraft.findUnique({
      where: {
        userId_leagueId: {
          userId: session.user.id,
          leagueId: activeLeagueId,
        },
      },
      select: {
        bonusDrafts: true,
      },
    }),
    prisma.officialSubmission.findFirst({
      where: {
        userId: session.user.id,
        leagueId: activeLeagueId,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        submittedAt: true,
      },
    }),
  ]);

  const bonusQuestions = await prisma.bonusQuestion.findMany({
    include: {
      answers: {
        where: {
          userId: session.user.id,
          leagueId: activeLeagueId,
        },
      },
    },
    orderBy: [{ deadline: "asc" }, { question: "asc" }],
  });

  const bonusData = bonusQuestions.map((question) => ({
    id: question.id,
    question: question.question,
    options: question.options,
    deadline: question.deadline.toISOString(),
    answer: question.answers[0]?.answer ?? null,
    officialAnswer: question.answers[0]?.answer ?? null,
  }));

  const draftBonusMap = new Map<string, string>(
    Array.isArray(leagueDraft?.bonusDrafts)
      ? leagueDraft.bonusDrafts
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }

            const row = item as { questionId?: unknown; answer?: unknown };
            if (typeof row.questionId === "string" && typeof row.answer === "string") {
              return [row.questionId, row.answer] as const;
            }

            return null;
          })
          .filter((entry): entry is readonly [string, string] => Boolean(entry))
      : []
  );

  const bonusDataWithDraft = bonusData.map((row) => ({
    ...row,
    answer: draftBonusMap.get(row.id) ?? row.answer,
  }));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">Pronósticos</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Rellena tu pronóstico por fase. Se puntúa por acertar goles exactos y clasificados.
        </p>
      </div>

      {activeLeague && (
        <ActiveLeagueHero
          name={activeLeague.name}
          code={activeLeague.code}
          description="Comparte este código con tus amigos para que entren en la misma liga antes de rellenar sus pronósticos."
        />
      )}

      {predictionsCount === 0 && (
        <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-700/50 dark:bg-amber-900/20">
          <p className="text-sm font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">Primer paso recomendado</p>
          <h2 className="mt-1 text-xl font-black">Empieza por tus Pronósticos</h2>
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
            Acabas de entrar a una liga. Completa tus predicciones para aparecer en la clasificación y evitar quedarte atrás.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="#predictions-board" className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
              Empezar pronósticos
            </a>
            <Link href="/rankings" className="rounded-xl bg-neutral-900 px-4 py-2 font-bold text-white dark:bg-neutral-100 dark:text-black">
              Ver clasificación de liga
            </Link>
            <Link href="/bracket" className="rounded-xl border border-black/10 bg-white px-4 py-2 font-bold dark:border-white/10 dark:bg-neutral-900">
              Ver cruces
            </Link>
          </div>
        </section>
      )}
      
      <div id="predictions-board">
        <UnifiedPredictionsBoard
          matches={data}
          bonusQuestions={bonusDataWithDraft}
          scoringSettings={scoringSettings}
          initialLastOfficialSubmittedAt={latestOfficialSubmission?.submittedAt.toISOString() ?? null}
        />
      </div>
    </main>
  );
}
