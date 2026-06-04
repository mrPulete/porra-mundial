import Link from "next/link";
import { BracketEditor } from "@/components/bracket-editor";
import { auth } from "@/lib/auth";
import { resolveActiveLeagueForUser } from "@/lib/active-league";
import { getMatchBoardData } from "@/lib/match-board-data";

export default async function BracketPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Cuadro de eliminatorias</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Necesitas iniciar sesión para editar tus cruces.</p>
        <Link href="/login" className="inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
          Entrar
        </Link>
      </main>
    );
  }

  const leagueContext = await resolveActiveLeagueForUser(session.user.id);
  if (!leagueContext.activeLeagueId) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Cuadro de eliminatorias</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Tu sesión ya no coincide con un usuario válido. Vuelve a iniciar sesión.</p>
        <Link href="/login" className="inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
          Entrar
        </Link>
      </main>
    );
  }

  const boardData = await getMatchBoardData({
    mode: "predictions",
    userId: session.user.id,
    leagueId: leagueContext.activeLeagueId,
  });

  const bracketMatches = boardData.map((match) => ({
    id: match.id,
    stage: match.stage,
    group: match.group,
    code: match.code,
    kickoffAt: new Date(match.kickoffAt),
    stadium: match.stadium,
    city: match.city,
    homeName: match.homeName,
    homeFlag: match.homeFlag,
    homeTeamId: match.homeTeamId,
    awayName: match.awayName,
    awayFlag: match.awayFlag,
    awayTeamId: match.awayTeamId,
    isFinished: match.isFinished,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    predictedQualifiedTeamId: match.predictedQualifiedTeamId,
  }));

  const initialScores = Object.fromEntries(
    boardData.map((match) => [
      match.id,
      {
        home: match.predictedHome?.toString() ?? "",
        away: match.predictedAway?.toString() ?? "",
      },
    ])
  );

  const initialQualifiers = Object.fromEntries(
    boardData.map((match) => [match.id, match.predictedQualifiedTeamId ?? ""])
  );

  const isAdmin = session.user.role === "ADMIN";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8">
      <h1 className="text-3xl font-black">Cuadro de eliminatorias</h1>
      <p className="text-neutral-600 dark:text-neutral-300">Misma lógica que en pronósticos: código, hora, sede y resultado sincronizado.</p>
      <BracketEditor
        matches={bracketMatches}
        initialScores={initialScores}
        initialQualifiers={initialQualifiers}
        readOnly={isAdmin}
      />
    </main>
  );
}
