"use client";

import type { CalendarMatch } from "../team-page";
import type { MatchResult } from "@/lib/football-api";

export default function TeamHeadToHead({
  nextMatch,
  recentMatches,
}: {
  nextMatch: CalendarMatch;
  recentMatches: MatchResult[];
}) {
  // Filter matches against the next opponent
  const h2h = recentMatches.filter(
    (m) => m.opponent.toLowerCase().includes(nextMatch.opponentName.toLowerCase().split(" ")[0])
  );

  if (h2h.length === 0) return null;

  const wins = h2h.filter((m) => m.result === "W").length;
  const draws = h2h.filter((m) => m.result === "D").length;
  const losses = h2h.filter((m) => m.result === "L").length;
  const gf = h2h.reduce((s, m) => s + m.goalsFor, 0);
  const gc = h2h.reduce((s, m) => s + m.goalsAgainst, 0);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="font-bold mb-2 text-sm">
        H2H vs {nextMatch.opponentFlag} {nextMatch.opponentName}
      </div>
      <div className="flex gap-4 text-xs">
        <div className="flex gap-2">
          <span className="text-emerald-600 font-bold">{wins}V</span>
          <span className="text-neutral-500 font-bold">{draws}E</span>
          <span className="text-red-500 font-bold">{losses}D</span>
        </div>
        <div className="text-neutral-500">
          GF: {gf} · GC: {gc}
        </div>
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5">
        {h2h.slice(0, 3).map((m, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
            <span>{m.result === "W" ? "✅" : m.result === "D" ? "➖" : "❌"}</span>
            <span>{m.goalsFor}-{m.goalsAgainst}</span>
            <span className="text-[10px] text-neutral-400">{m.competition}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
