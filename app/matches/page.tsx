import Link from "next/link";
import { auth } from "@/lib/auth";
import { canAccessAdminForLeague } from "@/lib/league-admin";
import { resolveActiveLeagueForUser } from "@/lib/active-league";
import { prisma } from "@/lib/prisma";
import { getScoringSettings } from "@/lib/scoring-settings";
import { getMatchBoardData } from "@/lib/match-board-data";
import { UnifiedPredictionsBoard } from "@/components/unified-predictions-board";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string; viewUserId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  const isAdminViewerMode = Boolean(session?.user?.role === "ADMIN" && params.viewUserId && params.leagueId);

  if (isAdminViewerMode) {
    const leagueId = params.leagueId!;
    const viewUserId = params.viewUserId!;
    const hasAccess = await canAccessAdminForLeague(session!.user.id, leagueId, session!.user.role);

    if (!hasAccess) {
      return (
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <h1 className="text-3xl font-black">Resultados</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">No tienes acceso a esta liga.</p>
          <Link href="/admin" className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
            Volver a Admin
          </Link>
        </main>
      );
    }

    const [viewer, matches, scoringSettings, leagueContext] = await Promise.all([
      prisma.user.findUnique({
        where: { id: viewUserId },
        select: { id: true, name: true, email: true, role: true },
      }),
      getMatchBoardData({ mode: "predictions", userId: viewUserId, leagueId }),
      getScoringSettings(),
      resolveActiveLeagueForUser(session!.user.id),
    ]);

    if (!viewer || viewer.role === "ADMIN") {
      return (
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <h1 className="text-3xl font-black">Resultados</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Jugador no valido para vista de resultados.</p>
          <Link href="/admin" className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
            Volver a Admin
          </Link>
        </main>
      );
    }

    const isMember = await prisma.league.findFirst({
      where: {
        id: leagueId,
        OR: [{ ownerId: viewUserId }, { members: { some: { userId: viewUserId } } }],
      },
      select: { id: true },
    });

    if (!isMember) {
      return (
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <h1 className="text-3xl font-black">Resultados</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">El jugador no pertenece a la liga seleccionada.</p>
          <Link href="/admin" className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
            Volver a Admin
          </Link>
        </main>
      );
    }

    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Vista Admin</p>
          <h1 className="text-3xl font-black">Resultados de {viewer.name}</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{viewer.email}</p>
          <Link
            href={`/admin?leagueId=${leagueId}&viewUserId=${viewUserId}`}
            className="mt-3 inline-block rounded-xl bg-neutral-900 px-3 py-1.5 text-sm font-bold text-white dark:bg-neutral-100 dark:text-black"
          >
            Volver a Admin
          </Link>
        </div>

        <UnifiedPredictionsBoard
          matches={matches}
          bonusQuestions={[]}
          scoringSettings={scoringSettings}
          readOnly
          showQuestions={false}
        />
      </main>
    );
  }

  const [matches, scoringSettings] = await Promise.all([getMatchBoardData({ mode: "results" }), getScoringSettings()]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">Resultados</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Sigue la fase de grupos y las eliminatorias con la misma estructura visual de pronosticos, en modo solo lectura.
        </p>
      </div>

      <UnifiedPredictionsBoard
        matches={matches}
        bonusQuestions={[]}
        scoringSettings={scoringSettings}
        readOnly
        showQuestions={false}
      />
    </main>
  );
}
