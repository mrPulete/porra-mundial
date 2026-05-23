import type { TeamData } from "../team-page";

export default function TeamKeyStats({ teamData }: { teamData: TeamData }) {
  const avgGoals = teamData.matchesPlayed > 0
    ? (teamData.goalsFor / teamData.matchesPlayed).toFixed(1)
    : "—";
  const avgConceded = teamData.matchesPlayed > 0
    ? (teamData.goalsConceded / teamData.matchesPlayed).toFixed(1)
    : "—";
  const wins = teamData.recentForm.filter((f) => f.result === "W").length;
  const draws = teamData.recentForm.filter((f) => f.result === "D").length;
  const losses = teamData.recentForm.filter((f) => f.result === "L").length;
  const cleanSheets = teamData.recentForm.filter((f) => f.conceded === 0).length;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <div className="min-w-[100px] bg-white dark:bg-neutral-900 rounded-lg p-3 flex flex-col items-center shadow-sm">
        <span className="text-xs text-neutral-500">Partidos</span>
        <span className="font-bold text-lg">{teamData.matchesPlayed}</span>
      </div>
      <div className="min-w-[100px] bg-white dark:bg-neutral-900 rounded-lg p-3 flex flex-col items-center shadow-sm">
        <span className="text-xs text-neutral-500">V / E / D</span>
        <span className="font-bold text-lg">{wins}/{draws}/{losses}</span>
      </div>
      <div className="min-w-[100px] bg-white dark:bg-neutral-900 rounded-lg p-3 flex flex-col items-center shadow-sm">
        <span className="text-xs text-neutral-500">Goles/Partido</span>
        <span className="font-bold text-lg">{avgGoals}</span>
      </div>
      <div className="min-w-[100px] bg-white dark:bg-neutral-900 rounded-lg p-3 flex flex-col items-center shadow-sm">
        <span className="text-xs text-neutral-500">GC/Partido</span>
        <span className="font-bold text-lg">{avgConceded}</span>
      </div>
      <div className="min-w-[100px] bg-white dark:bg-neutral-900 rounded-lg p-3 flex flex-col items-center shadow-sm">
        <span className="text-xs text-neutral-500">Porterías a 0</span>
        <span className="font-bold text-lg">{cleanSheets}</span>
      </div>
    </div>
  );
}
