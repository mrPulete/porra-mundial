"use client";

import type { MatchStage, PenaltyTarget, PredictionChangeType, ScoringRuleType } from "@prisma/client";
import { useState, type Dispatch, type SetStateAction } from "react";
import { ResultsInputPanel } from "./results-input-panel";
import { TemplateUploader } from "../template-uploader";

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
  lockAt: Date;
  group: string | null;
  kickoffAt: Date;
};

type Rule = {
  id: string;
  stage: MatchStage;
  ruleType: ScoringRuleType;
  points: number;
  enabled: boolean;
};

type BonusRule = {
  id: string;
  code: string;
  label: string;
  points: number;
  enabled: boolean;
  sortOrder: number;
};

type PenaltyRule = {
  id: string;
  target: PenaltyTarget;
  points: number;
  enabled: boolean;
};

type HistoryEntry = {
  id: string;
  createdAt: string;
  userName: string;
  changeType: PredictionChangeType;
  penaltyApplied: number;
  matchLabel: string | null;
  questionLabel: string | null;
};

type LeagueOption = {
  id: string;
  name: string;
};

type UserSubmissionSummary = {
  userId: string;
  userName: string;
  userEmail: string;
  isOwner: boolean;
  latestOfficialVersion: number | null;
  latestOfficialSubmittedAt: string | null;
  savedPredictions: number;
  remainingPredictions: number;
  hasOfficialSubmission: boolean;
};

type DemoAction =
  | "GENERATE_DEMO_USERS"
  | "GENERATE_DEMO_LEAGUES"
  | "GENERATE_PREDICTIONS"
  | "SIMULATE_MATCHDAY"
  | "SIMULATE_ROUND"
  | "SIMULATE_TOURNAMENT"
  | "RESET_TOURNAMENT";

type RoundLockMode = "LOCK" | "UNLOCK";

const STAGE_LABELS: Record<MatchStage, string> = {
  GROUP: "Fase de Grupos",
  ROUND_OF_32: "32avos",
  ROUND_OF_16: "16avos",
  QUARTER_FINAL: "Cuartos",
  SEMI_FINAL: "Semis",
  THIRD_PLACE: "Tercer Lugar",
  FINAL: "Final",
};

const STAGE_ORDER: MatchStage[] = [
  "GROUP",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

type StageLockState = "LOCKED" | "OPEN" | "MIXED";

export function AdminConsole({
  currentTimestamp,
  matches,
  rules,
  bonusRules,
  penaltyRules,
  history,
  leagues,
  activeLeagueId,
  userSubmissionSummaries,
  demoToolsEnabled,
}: {
  currentTimestamp: number;
  matches: AdminMatch[];
  rules: Rule[];
  bonusRules: BonusRule[];
  penaltyRules: PenaltyRule[];
  history: HistoryEntry[];
  leagues: LeagueOption[];
  activeLeagueId: string;
  userSubmissionSummaries: UserSubmissionSummary[];
  demoToolsEnabled: boolean;
}) {
  const [localRules, setLocalRules] = useState<Rule[]>(rules);
  const [localBonusRules, setLocalBonusRules] = useState<BonusRule[]>(bonusRules);
  const [localPenaltyRules, setLocalPenaltyRules] = useState<PenaltyRule[]>(penaltyRules);
  const [message, setMessage] = useState("");
  const [savingResults, setSavingResults] = useState(false);
  const [savingScoring, setSavingScoring] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [runningDemoAction, setRunningDemoAction] = useState<DemoAction | null>(null);
  const [demoUsers, setDemoUsers] = useState(4);
  const [demoLeagues, setDemoLeagues] = useState(3);
  const [demoMemberships, setDemoMemberships] = useState(2);
  const [roundLockAction, setRoundLockAction] = useState<{ stage: MatchStage; mode: RoundLockMode } | null>(null);
  const [resettingPorra, setResettingPorra] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [resettingUserPredictionsId, setResettingUserPredictionsId] = useState<string | null>(null);
  const [resettingLeaguePlayerResults, setResettingLeaguePlayerResults] = useState(false);

  const buildUserResultsHref = (userId: string) =>
    `/matches?leagueId=${encodeURIComponent(activeLeagueId)}&viewUserId=${encodeURIComponent(userId)}`;

  const stageButtons = STAGE_ORDER.filter((stage) => matches.some((match) => match.stage === stage));
  const stageStateByStage = (() => {
    const now = currentTimestamp;
    const map = new Map<MatchStage, StageLockState>();

    for (const stage of stageButtons) {
      const stageMatches = matches.filter((match) => match.stage === stage);
      const lockedCount = stageMatches.filter((match) => new Date(match.lockAt).getTime() <= now).length;

      if (lockedCount === 0) {
        map.set(stage, "OPEN");
      } else if (lockedCount === stageMatches.length) {
        map.set(stage, "LOCKED");
      } else {
        map.set(stage, "MIXED");
      }
    }

    return map;
  })();

  const stageStateClass: Record<StageLockState, string> = {
    LOCKED: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    OPEN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    MIXED: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200",
  };

  const stageStateLabel: Record<StageLockState, string> = {
    LOCKED: "Bloqueada",
    OPEN: "Abierta",
    MIXED: "Mixta",
  };

  const lockSummary = stageButtons.reduce(
    (acc, stage) => {
      const state = stageStateByStage.get(stage) ?? "OPEN";
      if (state === "LOCKED") {
        acc.locked += 1;
      } else if (state === "OPEN") {
        acc.open += 1;
      } else {
        acc.mixed += 1;
      }
      return acc;
    },
    { locked: 0, open: 0, mixed: 0 }
  );

  const isPredictionsUnlocked = matches.some((match) => new Date(match.lockAt).getTime() > currentTimestamp);

  const updateRule = <T extends { points: number; enabled: boolean }, K extends "points" | "enabled">(
    setRules: Dispatch<SetStateAction<T[]>>,
    index: number,
    field: K,
    value: T[K],
  ) => {
    setRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const deleteRule = (id: string) => {
    setLocalRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const triggerDemoAction = async (action: DemoAction) => {
    setRunningDemoAction(action);
    setMessage("");

    try {
      const res = await fetch("/api/admin/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          leagueId: activeLeagueId,
          userCount: demoUsers,
          leagueCount: demoLeagues,
          maxMembershipsPerUser: demoMemberships,
        }),
      });

      const raw = await res.text();
      const data = raw ? (JSON.parse(raw) as { message?: string; error?: string }) : {};

      setMessage(res.ok ? data.message || "Accion demo completada" : data.error || "Error ejecutando accion demo");

      if (res.ok) {
        setTimeout(() => window.location.reload(), 500);
      }
    } catch {
      setMessage("Error ejecutando accion demo");
    } finally {
      setRunningDemoAction(null);
    }
  };

  const saveRules = async () => {
    setSavingScoring(true);
    setMessage("");

    const payload = {
      leagueId: activeLeagueId,
      rules: localRules.map((rule) => ({
        id: rule.id,
        stage: rule.stage,
        ruleType: rule.ruleType,
        points: rule.points,
        enabled: rule.enabled,
      })),
      bonusRules: localBonusRules.map((rule) => ({
        id: rule.id,
        code: rule.code,
        label: rule.label,
        points: rule.points,
        enabled: rule.enabled,
        sortOrder: rule.sortOrder,
      })),
      penaltyRules: localPenaltyRules.map((rule) => ({
        id: rule.id,
        target: rule.target,
        points: rule.points,
        enabled: rule.enabled,
      })),
    };

    const res = await fetch("/api/admin/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setMessage(res.ok ? "Scoring actualizado" : data.error || "Error actualizando scoring");
    setSavingScoring(false);
  };

  const triggerRecalculate = async () => {
    setRecalculating(true);
    setMessage("");

    const res = await fetch("/api/admin/recalculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId: activeLeagueId }),
    });

    const data = await res.json();
    setMessage(res.ok ? "Recalculo completado" : data.error || "Error en recalculo");
    setRecalculating(false);
  };

  const saveResults = async (results: { matchId: string; homeScore: number; awayScore: number; qualifiedTeamId?: string | null }[]) => {
    setMessage("");
    setSavingResults(true);
    
    const res = await fetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId: activeLeagueId, results }),
    });

    const data = await res.json();
    setMessage(res.ok ? "Resultados guardados y ranking recalculado ✓" : data.error || "Error guardando resultados");
    setSavingResults(false);
    
    if (res.ok) {
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const setRoundLock = async (stage: MatchStage, mode: RoundLockMode) => {
    setRoundLockAction({ stage, mode });
    setMessage("");

    try {
      const res = await fetch("/api/admin/lock-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: activeLeagueId, stage, mode }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      setMessage(
        res.ok
          ? data.message || (mode === "LOCK" ? "Fases bloqueadas" : "Fases desbloqueadas")
          : data.error || (mode === "LOCK" ? "Error bloqueando fases" : "Error desbloqueando fases")
      );

      if (res.ok) {
        setTimeout(() => window.location.reload(), 600);
      }
    } catch {
      setMessage(mode === "LOCK" ? "Error bloqueando fases" : "Error desbloqueando fases");
    } finally {
      setRoundLockAction(null);
    }
  };

  const resetPorra = async () => {
    const ok = window.confirm("Esto borrará usuarios, ligas, resultados y pronósticos. Se conservarán solo los admins. ¿Continuar?");
    if (!ok) {
      return;
    }

    setResettingPorra(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/reset-porra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preserveAdmin: true }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      setMessage(res.ok ? data.message || "Porra reiniciada" : data.error || "Error reiniciando porra");

      if (res.ok) {
        setTimeout(() => window.location.reload(), 900);
      }
    } catch {
      setMessage("Error reiniciando porra");
    } finally {
      setResettingPorra(false);
    }
  };

  const removeUserFromLeague = async (user: Pick<UserSubmissionSummary, "userId" | "userName" | "isOwner">) => {
    if (user.isOwner) {
      setMessage("No puedes borrar al creador de la liga.");
      return;
    }

    const ok = window.confirm(`Se eliminará a ${user.userName} de esta liga y se borrarán sus datos de la porra en esta liga. ¿Continuar?`);
    if (!ok) {
      return;
    }

    setRemovingUserId(user.userId);
    setMessage("");

    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: activeLeagueId, userId: user.userId }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      setMessage(res.ok ? data.message || "Usuario eliminado de la liga" : data.error || "Error borrando usuario");

      if (res.ok) {
        setTimeout(() => window.location.reload(), 700);
      }
    } catch {
      setMessage("Error borrando usuario");
    } finally {
      setRemovingUserId(null);
    }
  };

  const resetUserPredictions = async (user: Pick<UserSubmissionSummary, "userId" | "userName">) => {
    if (!isPredictionsUnlocked) {
      setMessage("La porra esta bloqueada. Desbloquea una ronda para poder resetear pronosticos.");
      return;
    }

    const ok = window.confirm(`Se borraran los pronosticos y respuestas bonus de ${user.userName} en esta liga. El usuario seguira en la liga. ¿Continuar?`);
    if (!ok) {
      return;
    }

    setResettingUserPredictionsId(user.userId);
    setMessage("");

    try {
      const res = await fetch("/api/admin/users/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: activeLeagueId, userId: user.userId }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      setMessage(res.ok ? data.message || "Pronosticos del usuario reseteados" : data.error || "Error reseteando usuario");

      if (res.ok) {
        setTimeout(() => window.location.reload(), 700);
      }
    } catch {
      setMessage("Error reseteando usuario");
    } finally {
      setResettingUserPredictionsId(null);
    }
  };

  const resetLeaguePlayerResults = async () => {
    if (!isPredictionsUnlocked) {
      setMessage("La porra esta bloqueada. Desbloquea una ronda para poder resetear pronosticos.");
      return;
    }

    const ok = window.confirm("Se borraran los pronosticos y respuestas bonus de todos los jugadores de esta liga, pero no se borrara ningun jugador. ¿Continuar?");
    if (!ok) {
      return;
    }

    setResettingLeaguePlayerResults(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/users/reset-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: activeLeagueId }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      setMessage(res.ok ? data.message || "Resultados de jugadores reiniciados" : data.error || "Error reiniciando resultados de jugadores");

      if (res.ok) {
        setTimeout(() => window.location.reload(), 700);
      }
    } catch {
      setMessage("Error reiniciando resultados de jugadores");
    } finally {
      setResettingLeaguePlayerResults(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
        <h2 className="text-lg font-black">Liga de configuración</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {leagues.map((league) => (
            <a
              key={league.id}
              href={`/admin?leagueId=${league.id}`}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                league.id === activeLeagueId
                  ? "bg-emerald-700 text-white"
                  : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200"
              }`}
            >
              {league.name}
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
        <h2 className="text-lg font-black">2) Configuración de puntuaciones y penalizaciones</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Todos los puntos se leen de base de datos y son independientes por liga.
        </p>

        <h3 className="mt-4 text-sm font-black uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
          Reglas de partidos
        </h3>
        <div className="mt-2 space-y-2">
          {localRules.map((rule, index) => (
            <div key={rule.id} className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 p-2 text-sm dark:border-white/10 md:grid-cols-[1fr_1fr_7rem_6rem]">
              <p className="font-bold">{rule.stage}</p>
              <p className="font-semibold text-neutral-600 dark:text-neutral-300">{rule.ruleType}</p>
              <input
                type="number"
                min={-100}
                max={100}
                value={rule.points}
                onChange={(e) => updateRule(setLocalRules, index, "points", Number(e.target.value))}
                className="rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-800 dark:text-white"
              />
              <button
                onClick={() => deleteRule(rule.id)}
                className="rounded-md bg-red-600 px-2 py-1 text-sm font-bold text-white"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>

        <h3 className="mt-4 text-sm font-black uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
          Reglas bonus
        </h3>
        <div className="mt-2 space-y-2">
          {localBonusRules.map((rule, index) => (
            <div key={rule.id} className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 p-2 text-sm dark:border-white/10 md:grid-cols-[1fr_7rem_6rem]">
              <p className="font-bold">{rule.label}</p>
              <input
                type="number"
                min={-100}
                max={100}
                value={rule.points}
                onChange={(e) => updateRule(setLocalBonusRules, index, "points", Number(e.target.value))}
                className="rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-800 dark:text-white"
              />
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => updateRule(setLocalBonusRules, index, "enabled", e.target.checked)}
                  className="rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-800 dark:text-white"
                />
                Activa
              </label>
            </div>
          ))}
        </div>

        <h3 className="mt-4 text-sm font-black uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Penalizaciones</h3>
        <div className="mt-2 space-y-2">
          {localPenaltyRules.map((rule, index) => (
            <div key={rule.id} className="grid grid-cols-1 gap-2 rounded-xl border border-black/10 p-2 text-sm dark:border-white/10 md:grid-cols-[1fr_7rem_6rem]">
              <p className="font-bold">{rule.target}</p>
              <input
                type="number"
                min={-100}
                max={100}
                value={rule.points}
                onChange={(e) => updateRule(setLocalPenaltyRules, index, "points", Number(e.target.value))}
                className="rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-800 dark:text-white"
              />
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => updateRule(setLocalPenaltyRules, index, "enabled", e.target.checked)}
                  className="rounded-md border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-800 dark:text-white"
                />
                Activa
              </label>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={saveRules}
            disabled={savingScoring}
            className="rounded-xl bg-neutral-900 px-4 py-2 font-bold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-black"
          >
            {savingScoring ? "Guardando..." : "Guardar scoring"}
          </button>
          <button
            onClick={triggerRecalculate}
            disabled={recalculating}
            className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {recalculating ? "Recalculando..." : "Recalcular puntuaciones"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
        <h2 className="text-lg font-black">3) Resultados oficiales</h2>
        <div className="mt-3 rounded-2xl border border-black/10 bg-neutral-50 p-3 dark:border-white/10 dark:bg-neutral-800/50">
          <p className="text-xs font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Bloquear / desbloquear desde ronda</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Cada botón aplica desde esa fase en adelante. Las fases anteriores no se tocan.
          </p>
          <p className="mt-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            Estado fases: {lockSummary.locked} bloqueadas · {lockSummary.open} abiertas · {lockSummary.mixed} mixtas
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {stageButtons.map((stage) => (
              <div key={stage} className="flex items-center gap-1 rounded-xl border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-neutral-900">
                <span
                  className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide ${stageStateClass[stageStateByStage.get(stage) ?? "OPEN"]}`}
                  title="Estado actual de esta fase"
                >
                  {stageStateLabel[stageStateByStage.get(stage) ?? "OPEN"]}
                </span>
                <button
                  onClick={() => setRoundLock(stage, "LOCK")}
                  disabled={roundLockAction !== null || savingResults}
                  className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {roundLockAction?.stage === stage && roundLockAction.mode === "LOCK" ? "Bloqueando..." : `Bloquear ${STAGE_LABELS[stage]}`}
                </button>
                <button
                  onClick={() => setRoundLock(stage, "UNLOCK")}
                  disabled={roundLockAction !== null || savingResults}
                  className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {roundLockAction?.stage === stage && roundLockAction.mode === "UNLOCK" ? "Desbloqueando..." : `Desbloquear ${STAGE_LABELS[stage]}`}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <ResultsInputPanel matches={matches} onSaveResults={saveResults} loading={savingResults} />
        </div>
      </section>

      <section className="rounded-3xl border border-red-500/30 bg-red-50/70 p-4 dark:border-red-400/30 dark:bg-red-500/10">
        <h2 className="text-lg font-black text-red-800 dark:text-red-300">8) Mantenimiento</h2>
        <p className="mt-1 text-sm text-red-700/90 dark:text-red-200">
          Reinicia completamente la porra: elimina usuarios no admin, ligas, resultados, pronósticos e historial.
        </p>
        <button
          onClick={resetPorra}
          disabled={resettingPorra}
          className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {resettingPorra ? "Reseteando..." : "Reset Porra"}
        </button>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
        <h2 className="text-lg font-black">4) Cargar resultados por plantilla</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Descarga una plantilla CSV/TSV, rellénala con los resultados, y cárgala aquí para actualizar todos los partidos de una vez.
        </p>
        <div className="mt-3">
          <TemplateUploader
            onUploadSuccess={(msg) => setMessage(msg)}
            onError={(err) => setMessage(err)}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
        <h2 className="text-lg font-black">5) Historial de cambios (auditoría)</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Sin movimientos registrados en esta liga.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <th className="px-2 py-1">Fecha</th>
                  <th className="px-2 py-1">Usuario</th>
                  <th className="px-2 py-1">Tipo</th>
                  <th className="px-2 py-1">Elemento</th>
                  <th className="px-2 py-1 text-right">Penalización</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-2 py-1">{new Date(item.createdAt).toLocaleString("es-ES")}</td>
                    <td className="px-2 py-1">{item.userName}</td>
                    <td className="px-2 py-1">{item.changeType}</td>
                    <td className="px-2 py-1">{item.matchLabel ?? item.questionLabel ?? "-"}</td>
                    <td className="px-2 py-1 text-right font-bold">{item.penaltyApplied}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
        <h2 className="text-lg font-black">6) Predicciones oficiales por jugador</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Abre la pantalla de cada jugador en una pestaña nueva. Aquí ves el estado de progreso de su porra.
        </p>
        <div className="mt-3">
          <button
            onClick={resetLeaguePlayerResults}
            disabled={!isPredictionsUnlocked || resettingLeaguePlayerResults || removingUserId !== null || resettingUserPredictionsId !== null}
            className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            title={isPredictionsUnlocked ? "Reinicia pronosticos de todos los jugadores de la liga" : "Solo disponible con la porra desbloqueada"}
          >
            {resettingLeaguePlayerResults ? "Reiniciando jugadores..." : "Reiniciar resultados de jugadores"}
          </button>
          {!isPredictionsUnlocked && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Accion deshabilitada: la porra esta bloqueada.</p>
          )}
        </div>

        {userSubmissionSummaries.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No hay usuarios para mostrar en esta liga.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {userSubmissionSummaries.map((user) => (
              <article key={user.userId} className="rounded-xl border border-black/10 bg-neutral-50 p-3 text-sm dark:border-white/10 dark:bg-neutral-800/40">
                <p className="font-black">
                  {user.userName}
                  {user.isOwner ? " (Creador)" : ""}
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.userEmail}</p>
                <div className="mt-2 space-y-0.5 text-xs text-neutral-700 dark:text-neutral-200">
                  <p>Pronósticos guardados: {user.savedPredictions}</p>
                  <p>Pendientes: {user.remainingPredictions}</p>
                  <p>Estado: {user.hasOfficialSubmission ? `Enviado oficialmente (v${user.latestOfficialVersion})` : "Sin envío oficial"}</p>
                </div>
                {user.latestOfficialSubmittedAt && (
                  <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    Último envío: {new Date(user.latestOfficialSubmittedAt).toLocaleString("es-ES")}
                  </p>
                )}
                <a
                  href={buildUserResultsHref(user.userId)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white"
                >
                  Abrir pantalla del usuario
                </a>
                <button
                  onClick={() => resetUserPredictions(user)}
                  disabled={!isPredictionsUnlocked || resettingUserPredictionsId !== null || removingUserId !== null}
                  className="mt-2 ml-2 inline-block rounded-lg bg-amber-700 px-2.5 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  title={isPredictionsUnlocked ? "Resetear pronosticos y bonus de este usuario" : "Solo disponible con la porra desbloqueada"}
                >
                  {resettingUserPredictionsId === user.userId ? "Reseteando..." : "Resetear usuario"}
                </button>
                <button
                  onClick={() => removeUserFromLeague(user)}
                  disabled={removingUserId !== null || resettingUserPredictionsId !== null || user.isOwner}
                  className="mt-2 ml-2 inline-block rounded-lg bg-red-700 px-2.5 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  title={user.isOwner ? "No se puede borrar al creador de la liga" : "Borrar usuario de la liga"}
                >
                  {removingUserId === user.userId ? "Borrando..." : "Borrar usuario"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {demoToolsEnabled && (
        <section className="rounded-3xl border border-dashed border-amber-500/40 bg-amber-50/70 p-4 dark:border-amber-400/30 dark:bg-amber-500/10">
          <h2 className="text-lg font-black">7) Datos de demo y simulación</h2>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
            Herramientas solo para desarrollo y testing. Simulan usuarios, ligas, pronósticos y avance del torneo con datos plausibles.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold">
              Usuarios demo
              <input
                type="number"
                min={1}
                max={200}
                value={demoUsers}
                onChange={(e) => setDemoUsers(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border px-2 py-1"
              />
            </label>
            <label className="text-sm font-semibold">
              Ligas demo
              <input
                type="number"
                min={1}
                max={20}
                value={demoLeagues}
                onChange={(e) => setDemoLeagues(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border px-2 py-1"
              />
            </label>
            <label className="text-sm font-semibold">
              Membresías máximas
              <input
                type="number"
                min={1}
                max={20}
                value={demoMemberships}
                onChange={(e) => setDemoMemberships(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border px-2 py-1"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <button
              onClick={() => triggerDemoAction("GENERATE_DEMO_USERS")}
              disabled={runningDemoAction !== null}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-black"
            >
              {runningDemoAction === "GENERATE_DEMO_USERS" ? "Generando..." : "Generar usuarios demo"}
            </button>
            <button
              onClick={() => triggerDemoAction("GENERATE_DEMO_LEAGUES")}
              disabled={runningDemoAction !== null}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-black"
            >
              {runningDemoAction === "GENERATE_DEMO_LEAGUES" ? "Generando..." : "Generar ligas demo"}
            </button>
            <button
              onClick={() => triggerDemoAction("GENERATE_PREDICTIONS")}
              disabled={runningDemoAction !== null}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {runningDemoAction === "GENERATE_PREDICTIONS" ? "Generando..." : "Generar pronósticos"}
            </button>
            <button
              onClick={() => triggerDemoAction("SIMULATE_MATCHDAY")}
              disabled={runningDemoAction !== null}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {runningDemoAction === "SIMULATE_MATCHDAY" ? "Simulando..." : "Simular jornada"}
            </button>
            <button
              onClick={() => triggerDemoAction("SIMULATE_ROUND")}
              disabled={runningDemoAction !== null}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {runningDemoAction === "SIMULATE_ROUND" ? "Simulando..." : "Simular ronda"}
            </button>
            <button
              onClick={() => triggerDemoAction("SIMULATE_TOURNAMENT")}
              disabled={runningDemoAction !== null}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {runningDemoAction === "SIMULATE_TOURNAMENT" ? "Simulando..." : "Simular torneo"}
            </button>
            <button
              onClick={() => triggerDemoAction("RESET_TOURNAMENT")}
              disabled={runningDemoAction !== null}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {runningDemoAction === "RESET_TOURNAMENT" ? "Reseteando..." : "Reiniciar torneo"}
            </button>
          </div>
        </section>
      )}

      {message && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{message}</p>}
    </div>
  );
}
