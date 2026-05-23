"use client";

import type { MatchResult } from "@/lib/football-api";

type Stats = {
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
  avgGoalsPerMatch: number;
  matchesPlayed: number;
};

export default function TeamRecentMatchesApi({ matches, stats }: { matches: MatchResult[]; stats: Stats }) {
  const last5 = matches.slice(0, 5);
  const icons: Record<string, string> = { W: "✅", D: "➖", L: "❌" };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">Forma Reciente</span>
        <div className="flex gap-0.5">
          {last5.map((m, i) => (
            <span key={i} className="text-base" title={`${m.opponent} (${m.goalsFor}-${m.goalsAgainst})`}>
              {icons[m.result]}
            </span>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 text-[11px] text-neutral-600 dark:text-neutral-400 mb-2">
        <span>GF: <strong>{stats.goalsScored}</strong></span>
        <span>GC: <strong>{stats.goalsConceded}</strong></span>
        <span>Porterías: <strong>{stats.cleanSheets}</strong></span>
        <span>Prom: <strong>{stats.avgGoalsPerMatch}</strong> g/p</span>
      </div>

      {/* Match list */}
      <div className="flex flex-col gap-1">
        {last5.map((m, i) => (
          <div key={i} className="flex items-center gap-2 text-xs py-0.5">
            <span className="w-4">{icons[m.result]}</span>
            <span className="flex-1 truncate">{m.opponent}</span>
            <span className="text-neutral-500 text-[10px] truncate max-w-[80px]">{m.competition}</span>
            <span className="font-bold tabular-nums">{m.goalsFor}-{m.goalsAgainst}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
