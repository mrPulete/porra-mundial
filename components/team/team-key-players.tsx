import type { TeamData } from "../team-page";

export default function TeamKeyPlayers({ teamData }: { teamData: TeamData }) {
  // Top scorers from match data
  const totalGoals = teamData.recentForm.reduce((s, f) => s + f.scored, 0);

  if (teamData.matchesPlayed === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
        <div className="font-bold mb-2 text-sm">Jugadores Destacados</div>
        <p className="text-xs text-neutral-500">Disponible cuando comience el torneo</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="font-bold mb-2 text-sm">Resumen Ofensivo</div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        <div className="min-w-[90px] rounded-lg p-2 flex flex-col items-center bg-neutral-50 dark:bg-neutral-800">
          <span className="text-2xl">⚽</span>
          <span className="text-xs mt-1 text-neutral-500">Goles Totales</span>
          <span className="font-bold text-sm">{totalGoals}</span>
        </div>
        <div className="min-w-[90px] rounded-lg p-2 flex flex-col items-center bg-neutral-50 dark:bg-neutral-800">
          <span className="text-2xl">🎯</span>
          <span className="text-xs mt-1 text-neutral-500">Goles/Partido</span>
          <span className="font-bold text-sm">{(totalGoals / teamData.matchesPlayed).toFixed(1)}</span>
        </div>
        <div className="min-w-[90px] rounded-lg p-2 flex flex-col items-center bg-neutral-50 dark:bg-neutral-800">
          <span className="text-2xl">🛡️</span>
          <span className="text-xs mt-1 text-neutral-500">GC Totales</span>
          <span className="font-bold text-sm">{teamData.goalsConceded}</span>
        </div>
      </div>
    </div>
  );
}
