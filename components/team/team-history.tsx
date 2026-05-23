import type { TeamData } from "../team-page";
import type { TeamFootballInfo } from "@/lib/football-api";

export default function TeamHistory({ teamData, footballData }: { teamData: TeamData; footballData: TeamFootballInfo | null }) {
  const history = footballData?.worldCupHistory;

  if (!history || history.appearances === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
        <div className="font-bold mb-1 text-sm">Mundiales</div>
        <p className="text-xs text-neutral-500">Sin participaciones previas en Copa del Mundo.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="font-bold mb-2 text-sm">Mundiales</div>
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-lg font-bold">{history.appearances}</div>
          <div className="text-[10px] text-neutral-500">Participaciones</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{history.titles}</div>
          <div className="text-[10px] text-neutral-500">Títulos</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold leading-tight mt-0.5">{history.bestFinish}</div>
          <div className="text-[10px] text-neutral-500">Mejor resultado</div>
        </div>
        <div className="text-center">
          <div className="text-[11px] font-medium leading-tight mt-1">{history.lastResult || "—"}</div>
          <div className="text-[10px] text-neutral-500">Último Mundial</div>
        </div>
      </div>
    </div>
  );
}
