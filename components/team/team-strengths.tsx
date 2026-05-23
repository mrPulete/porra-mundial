import type { TeamData } from "../team-page";

export default function TeamStrengths({ teamData }: { teamData: TeamData }) {
  if (teamData.matchesPlayed === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
        <div className="font-bold mb-2 text-sm">Fortalezas del Equipo</div>
        <p className="text-xs text-neutral-500">Disponible cuando comience el torneo</p>
      </div>
    );
  }

  const avgGoals = teamData.goalsFor / teamData.matchesPlayed;
  const avgConceded = teamData.goalsConceded / teamData.matchesPlayed;
  const wins = teamData.recentForm.filter((f) => f.result === "W").length;

  // Normalize to 0-100 scale for bars
  const attackPct = Math.min(100, Math.round((avgGoals / 3) * 100));
  const defensePct = Math.min(100, Math.round(((3 - avgConceded) / 3) * 100));
  const winPct = Math.round((wins / teamData.matchesPlayed) * 100);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="font-bold mb-2 text-sm">Fortalezas del Equipo</div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs w-20">Ataque</span>
          <div className="flex-1 h-2 bg-emerald-200 dark:bg-emerald-900/30 rounded-full overflow-hidden">
            <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${attackPct}%` }} />
          </div>
          <span className="text-xs text-neutral-500 w-8 text-right">{avgGoals.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-20">Defensa</span>
          <div className="flex-1 h-2 bg-blue-200 dark:bg-blue-900/30 rounded-full overflow-hidden">
            <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${defensePct}%` }} />
          </div>
          <span className="text-xs text-neutral-500 w-8 text-right">{avgConceded.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-20">Victorias</span>
          <div className="flex-1 h-2 bg-yellow-200 dark:bg-yellow-900/30 rounded-full overflow-hidden">
            <div className="h-2 bg-yellow-500 rounded-full" style={{ width: `${winPct}%` }} />
          </div>
          <span className="text-xs text-neutral-500 w-8 text-right">{winPct}%</span>
        </div>
      </div>
    </div>
  );
}
