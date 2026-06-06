"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type RankEntry = {
  position: number;
  name: string;
  points: number;
  exactHits: number;
  accuracy: number;
  completionPercentage: number;
  pointsByStage: Map<string, number>;
  bonusPoints: number;
};

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Grupos",
  ROUND_OF_32: "R32",
  ROUND_OF_16: "R16",
  QUARTER_FINAL: "CF",
  SEMI_FINAL: "SF",
  THIRD_PLACE: "3P",
  FINAL: "Final",
};

export function RankingsTable({ title, data }: { title: string; data: RankEntry[] }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  return (
    <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg dark:border-white/10 dark:bg-neutral-900/70">
      <h2 className="mb-3 text-lg font-black">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Aún no hay puntuaciones para esta liga.</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">#</th>
                <th>Usuario</th>
                <th>Puntos</th>
                <th>Exactos</th>
                <th>Precisión</th>
                <th>Relleno</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <div key={`${title}-${row.position}-${row.name}`}>
                  <tr
                    className="border-t border-black/5 cursor-pointer hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    onClick={() => setExpandedRow(expandedRow === row.position ? null : row.position)}
                  >
                    <td className="py-2 font-bold">{row.position}</td>
                    <td>{row.name}</td>
                    <td className="font-bold text-emerald-600 dark:text-emerald-400">{row.points}</td>
                    <td>{row.exactHits}</td>
                    <td>{Math.round(row.accuracy * 100)}%</td>
                    <td className="text-amber-600 dark:text-amber-400">{row.completionPercentage}%</td>
                    <td className="text-right">
                      {expandedRow === row.position ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>
                  {expandedRow === row.position && (
                    <tr className="border-t border-black/5 dark:border-white/10">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="space-y-2 text-xs">
                          <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
                            {Array.from(row.pointsByStage.entries()).map(([stage, points]) => (
                              <div key={stage} className="rounded bg-neutral-100 p-2 text-center dark:bg-neutral-800">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400">{points}</div>
                                <div className="text-neutral-600 dark:text-neutral-400">{STAGE_LABELS[stage] || stage}</div>
                              </div>
                            ))}
                          </div>
                          <div className="rounded bg-emerald-50 p-2 dark:bg-emerald-950">
                            <span className="font-bold">Bonus: </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.bonusPoints} pts</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </div>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
