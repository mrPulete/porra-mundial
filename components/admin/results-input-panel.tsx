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
  homeTeamId: string;
  awayTeamId: string;
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
  onSaveResults: (results: { matchId: string; homeScore: number; awayScore: number; qualifiedTeamId?: string | null }[]) => Promise<void>;
  loading?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<string>("GROUP");
  const [modalMatch, setModalMatch] = useState<AdminMatch | null>(null);
  const [modalScore, setModalScore] = useState({ home: "", away: "" });
  const [modalQualifiedTeamId, setModalQualifiedTeamId] = useState("");
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
  const [localQualifiedTeams, setLocalQualifiedTeams] = useState<Record<string, string>>({});

  const isKnockoutStage = (stage: MatchStage) => stage !== "GROUP";

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

  const groupedVisibleBuckets = useMemo(() => {
    const phaseMatches = groupedByPhase.get(activeTab) || [];
    const groups = new Map<string, AdminMatch[]>();

    if (activeTab === "GROUP") {
      for (const match of phaseMatches) {
        const key = `Grupo ${match.group ?? "-"}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)?.push(match);
      }

      for (const groupMatches of groups.values()) {
        groupMatches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
      }

      return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "es")));
    }

    for (const match of phaseMatches) {
      const dateKey = new Date(match.kickoffAt).toLocaleDateString("es-ES", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)?.push(match);
    }

    for (const dayMatches of groups.values()) {
      dayMatches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
    }

    return groups;
  }, [activeTab, groupedByPhase]);

  const handleSave = async () => {
    const resultsToSave = [];
    for (const match of matches) {
      const result = localResults[match.id];
      if (result?.home !== "" && result?.away !== "") {
        const isDraw = result.home === result.away;
        const qualifiedTeamId = isKnockoutStage(match.stage) && isDraw ? localQualifiedTeams[match.id] ?? null : null;
        resultsToSave.push({
          matchId: match.id,
          homeScore: Number(result.home),
          awayScore: Number(result.away),
          qualifiedTeamId,
        });
      }
    }
    await onSaveResults(resultsToSave);
  };

  const openResultModal = (match: AdminMatch) => {
    setModalMatch(match);
    setModalScore({
      home: localResults[match.id]?.home ?? "",
      away: localResults[match.id]?.away ?? "",
    });
    setModalQualifiedTeamId(localQualifiedTeams[match.id] ?? "");
  };

  const applyResultFromModal = () => {
    if (!modalMatch) {
      return;
    }

    const isDraw = modalScore.home !== "" && modalScore.away !== "" && modalScore.home === modalScore.away;
    const needsQualifier = isKnockoutStage(modalMatch.stage) && isDraw;

    setLocalResults((prev) => ({
      ...prev,
      [modalMatch.id]: {
        home: modalScore.home,
        away: modalScore.away,
      },
    }));

    setLocalQualifiedTeams((prev) => ({
      ...prev,
      [modalMatch.id]: needsQualifier ? modalQualifiedTeamId : "",
    }));

    setModalMatch(null);
  };

  const clearResultFromModal = () => {
    if (!modalMatch) {
      return;
    }

    setLocalResults((prev) => ({
      ...prev,
      [modalMatch.id]: {
        home: "",
        away: "",
      },
    }));

    setLocalQualifiedTeams((prev) => ({
      ...prev,
      [modalMatch.id]: "",
    }));

    setModalScore({ home: "", away: "" });
    setModalQualifiedTeamId("");
    setModalMatch(null);
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

              <button
                type="button"
                onClick={() => openResultModal(match)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <div className="flex h-9 w-12 items-center justify-center rounded-lg border border-black/20 bg-white px-2 py-1 text-center text-sm font-black dark:border-white/20 dark:bg-neutral-900">
                  {localResults[match.id]?.home ?? ""}
                </div>
                <span className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-black tracking-wide text-white">VS</span>
                <div className="flex h-9 w-12 items-center justify-center rounded-lg border border-black/20 bg-white px-2 py-1 text-center text-sm font-black dark:border-white/20 dark:bg-neutral-900">
                  {localResults[match.id]?.away ?? ""}
                </div>
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-xs font-bold leading-tight">{match.awayName}</p>
              </div>
            </div>

            {isKnockoutStage(match.stage) &&
              localResults[match.id]?.home !== "" &&
              localResults[match.id]?.away !== "" &&
              localResults[match.id]?.home === localResults[match.id]?.away && (
                <p className="mt-2 text-center text-[10px] text-neutral-500 dark:text-neutral-400">
                  Clasifica: {localQualifiedTeams[match.id] === match.homeTeamId ? match.homeName : localQualifiedTeams[match.id] === match.awayTeamId ? match.awayName : "pendiente"}
                </p>
              )}
          </div>
        ))}
      </div>
    );
  };

  const currentPhaseMatches = groupedByPhase.get(activeTab) || [];
  const pendingCount = currentPhaseMatches.filter((m) => {
    const scores = localResults[m.id];
    if (!scores?.home || !scores?.away) {
      return true;
    }

    if (isKnockoutStage(m.stage) && scores.home === scores.away) {
      return !localQualifiedTeams[m.id];
    }

    return false;
  }).length;

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
              {groupedVisibleBuckets.size > 0 ? (
                Array.from(groupedVisibleBuckets.entries()).map(([bucketLabel, bucketMatches]) => (
                  <div key={bucketLabel}>
                    <h4 className="mb-2 text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">{bucketLabel}</h4>
                    {renderMatchCards(bucketMatches)}
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

      {modalMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900">
            <h3 className="text-base font-black">Selecciona resultado</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {modalMatch.homeName} vs {modalMatch.awayName}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {new Date(modalMatch.kickoffAt).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
              {" · "}
              {new Date(modalMatch.kickoffAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              {" · "}
              {modalMatch.stadium || "Sede por confirmar"}
              {modalMatch.city ? `, ${modalMatch.city}` : ""}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {modalMatch.homeName}
                <select
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  value={modalScore.home}
                  onChange={(e) => setModalScore((prev) => ({ ...prev, home: e.target.value }))}
                >
                  <option value="">-</option>
                  {Array.from({ length: 11 }, (_, index) => (
                    <option key={index} value={String(index)}>
                      {index}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {modalMatch.awayName}
                <select
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  value={modalScore.away}
                  onChange={(e) => setModalScore((prev) => ({ ...prev, away: e.target.value }))}
                >
                  <option value="">-</option>
                  {Array.from({ length: 11 }, (_, index) => (
                    <option key={index} value={String(index)}>
                      {index}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {isKnockoutStage(modalMatch.stage) && modalScore.home !== "" && modalScore.away !== "" && modalScore.home === modalScore.away && (
              <label className="mt-3 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Si hay empate, ¿quien clasifica?
                <select
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  value={modalQualifiedTeamId}
                  onChange={(e) => setModalQualifiedTeamId(e.target.value)}
                >
                  <option value="">Sin seleccionar</option>
                  <option value={modalMatch.homeTeamId}>{modalMatch.homeName}</option>
                  <option value={modalMatch.awayTeamId}>{modalMatch.awayName}</option>
                </select>
              </label>
            )}

            <div className="mt-3 grid grid-cols-3 gap-1">
              {[
                { home: "1", away: "0" },
                { home: "1", away: "1" },
                { home: "0", away: "1" },
                { home: "2", away: "1" },
                { home: "2", away: "2" },
                { home: "1", away: "2" },
              ].map((score) => (
                <button
                  key={`${score.home}-${score.away}`}
                  onClick={() => setModalScore(score)}
                  className="rounded border border-black/10 px-2 py-1 text-xs font-bold hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-neutral-800"
                >
                  {score.home}-{score.away}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={clearResultFromModal}
                className="mr-auto rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                Borrar resultado
              </button>
              <button
                onClick={() => setModalMatch(null)}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-bold dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={applyResultFromModal}
                disabled={
                  modalScore.home === "" ||
                  modalScore.away === "" ||
                  (isKnockoutStage(modalMatch.stage) &&
                    modalScore.home === modalScore.away &&
                    !modalQualifiedTeamId)
                }
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
