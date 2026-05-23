import type { TeamData, CalendarMatch } from "../team-page";

export default function TeamHeader({ teamData, nextMatch }: { teamData: TeamData; nextMatch?: CalendarMatch }) {
  const fd = teamData.footballData;
  const eloRating = fd?.eloRating;
  const eloRank = fd?.eloRank;
  const coach = fd?.coach;

  return (
    <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <span className="text-3xl">{teamData.flag}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg truncate">{teamData.name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {teamData.fifaRank && (
              <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                FIFA #{teamData.fifaRank}
              </span>
            )}
            {eloRank && (
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                ELO #{eloRank} ({eloRating})
              </span>
            )}
            {teamData.group && (
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
                Grupo {teamData.group}
              </span>
            )}
          </div>
          {coach && (
            <div className="text-[10px] text-neutral-500 mt-0.5">DT: {coach}</div>
          )}
        </div>
      </div>

      {/* Next match compact preview */}
      {nextMatch && (
        <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400">Próximo</span>
            <span className="text-sm font-medium">
              {nextMatch.opponentFlag} {nextMatch.opponentName}
            </span>
            <span className="ml-auto text-[10px] text-neutral-500">
              {new Date(nextMatch.kickoffAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </span>
          </div>
          {fd?.odds?.passGroup && (
            <div className="flex gap-2 mt-1 text-[10px] text-neutral-500">
              <span>Pasa grupo: <strong className="text-emerald-600">{fd.odds.passGroup}%</strong></span>
              <span>·</span>
              <span>Campeón: <strong className="text-amber-600">{fd.odds.champion}%</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
