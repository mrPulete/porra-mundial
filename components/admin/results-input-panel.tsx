"use client";

import { MatchStage } from "@prisma/client";
import { useState, useMemo } from "react";

type AdminMatch = {
  id: string;
  stage: MatchStage;
  code: string | null;
  stadium: string;
  city: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  isFinished: boolean;
  group: string | null;
  kickoffAt: Date;
};

const PHASE_TABS = [
  { value: "GROUP", label: "Fase de Grupos" },
  { value: "ROUND_OF_32", label: "32avos" },
  { value: "ROUND_OF_16", label: "16avos" },
  { value: "QUARTER_FINAL", label: "Cuartos" },
  { value: "SEMI_FINAL", label: "Semis" },
  { value: "THIRD_PLACE", label: "Tercer Lugar" },
  { value: "FINAL", label: "Final" },
  { value: "BONUS", label: "Preguntas Adicionales" },
];

export function ResultsInputPanel({
  matches,
  onSaveResults,
  loading,
}: {
  matches: AdminMatch[];
  onSaveResults: (results: { matchId: string; homeScore: number; awayScore: number }[]) => Promise<void>;
  loading?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<string>("GROUP");
  const [localResults, setLocalResults] = useState<Record<string, { home: string; away: string }>>(() => {
    const init: Record<string, { home: string; away: string }> = {};
    for (const match of matches) {
      init[match.id] = {
        home: match.homeScore?.toString() ?? "",
        away: match.awayScore?.toString() ?? "",
      };
    }
    return init;
  });

  const groupedByPhase = useMemo(() => {
    const groups = new Map<string, AdminMatch[]>();
    for (const match of matches) {
      const key = match.stage;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(match);
    }
    return groups;
  }, [matches]);

  const groupedByDate = useMemo(() => {
    const phaseMatches = groupedByPhase.get(activeTab) || [];
    const dateGroups = new Map<string, AdminMatch[]>();
    for (const match of phaseMatches) {
      const dateKey = new Date(match.kickoffAt).toLocaleDateString("es-ES", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)?.push(match);
    }

    for (const dayMatches of dateGroups.values()) {
      dayMatches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
    }

    return dateGroups;
  }, [activeTab, groupedByPhase]);

  const handleSave = async () => {
    const resultsToSave = [];
    for (const match of matches) {
      const result = localResults[match.id];
      if (result?.home !== "" && result?.away !== "") {
        resultsToSave.push({
          matchId: match.id,
          homeScore: Number(result.home),
          awayScore: Number(result.away),
        });
      }
    }
    await onSaveResults(resultsToSave);
  };

  const renderMatchCards = (matchesToRender: AdminMatch[]) => {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {matchesToRender.map((match) => (
          <div key={match.id} className="rounded-2xl border border-black/5 bg-neutral-50 p-4 dark:border-white/10 dark:bg-neutral-800/50">
            <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {match.code ? match.code : match.group ? `Grupo ${match.group}` : "Partido"}
            </p>
            <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {new Date(match.kickoffAt).toLocaleDateString("es-ES", { month: "short", day: "numeric" }).toUpperCase()}
              {" · "}
              {new Date(match.kickoffAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="mb-3 text-center text-[10px] text-neutral-500 dark:text-neutral-400">
              {match.stadium}
              {match.city ? `, ${match.city}` : ""}
            </p>

            <div className="flex items-center justify-center gap-2">
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-xs font-bold leading-tight">{match.homeName}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="99"
                  className="h-9 w-12 rounded-lg border border-black/20 bg-white px-2 py-1 text-center text-sm font-black dark:border-white/20 dark:bg-neutral-900"
                  value={localResults[match.id]?.home ?? ""}
                  onChange={(e) =>
                    setLocalResults((prev) => ({
                      ...prev,
                      [match.id]: { ...prev[match.id], home: e.target.value },
                    }))
                  }
                  placeholder=""
                />
                <span className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-black tracking-wide text-white">VS</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  className="h-9 w-12 rounded-lg border border-black/20 bg-white px-2 py-1 text-center text-sm font-black dark:border-white/20 dark:bg-neutral-900"
                  value={localResults[match.id]?.away ?? ""}
                  onChange={(e) =>
                    setLocalResults((prev) => ({
                      ...prev,
                      [match.id]: { ...prev[match.id], away: e.target.value },
                    }))
                  }
                  placeholder=""
                />
              </div>

              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-xs font-bold leading-tight">{match.awayName}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const currentPhaseMatches = groupedByPhase.get(activeTab) || [];
  const pendingCount = currentPhaseMatches.filter((m) => !localResults[m.id]?.home || !localResults[m.id]?.away).length;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-black/10 bg-neutral-100 p-1 dark:border-white/10 dark:bg-neutral-800">
        {PHASE_TABS.map((tab) => {
          const tabMatches = groupedByPhase.get(tab.value) || [];
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-emerald-700 text-white"
                  : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700"
              }`}
            >
              {tab.label}
              {tab.value !== "BONUS" && <span className="ml-1 text-xs">({tabMatches.length})</span>}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
        {activeTab === "BONUS" ? (
          <div className="flex h-40 items-center justify-center text-center">
            <p className="text-neutral-500">Preguntas adicionales próximamente</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{PHASE_TABS.find((t) => t.value === activeTab)?.label}</h3>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white">
                  {pendingCount} pendientes
                </span>
              )}
            </div>

            <div className="space-y-4">
              {groupedByDate.size > 0 ? (
                Array.from(groupedByDate.entries()).map(([dateKey, dateMatches]) => (
                  <div key={dateKey}>
                    <h4 className="mb-2 text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{dateKey}</h4>
                    {renderMatchCards(dateMatches)}
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-neutral-500">No hay partidos en esta fase</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      {activeTab !== "BONUS" && (
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar Resultados"}
        </button>
      )}
    </div>
  );
}
