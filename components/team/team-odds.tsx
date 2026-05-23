"use client";

import type { TournamentOdds } from "@/lib/football-api";

const stages = [
  { key: "passGroup", label: "Pasa Grupo", color: "bg-emerald-500" },
  { key: "quarterFinal", label: "Cuartos", color: "bg-blue-500" },
  { key: "semiFinal", label: "Semifinal", color: "bg-purple-500" },
  { key: "final", label: "Final", color: "bg-amber-500" },
  { key: "champion", label: "Campeón", color: "bg-yellow-500" },
] as const;

export default function TeamOdds({ odds }: { odds: TournamentOdds }) {
  if (!odds.passGroup) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="font-bold mb-2 text-sm">Probabilidades</div>
      <div className="flex flex-col gap-1.5">
        {stages.map(({ key, label, color }) => {
          const value = odds[key];
          if (value == null) return null;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 w-16 shrink-0">{label}</span>
              <div className="flex-1 h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-xs font-bold w-9 text-right">{value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
