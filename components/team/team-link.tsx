"use client";

import { useEffect, useState } from "react";

type TeamSummary = {
  name: string;
  code: string;
  flag: string;
  group: string | null;
  matchesPlayed: number;
  goalsFor: number;
  goalsConceded: number;
  lastFive: string[];
  nextMatch: {
    opponent: string;
    opponentFlag: string;
    kickoffAt: string;
    stage: string;
  } | null;
};

export default function TeamLink({ teamId, name, flag, className = "" }: { teamId: string; name: string; flag?: string; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || summary || loading) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/summary`);
        const payload = (await response.json()) as { summary?: TeamSummary; error?: string };
        if (!response.ok || !payload.summary) {
          throw new Error(payload.error ?? "No se pudo cargar el resumen del equipo");
        }

        if (!cancelled) {
          setSummary(payload.summary);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el resumen del equipo");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, loading, summary, teamId]);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1 font-semibold hover:underline focus:outline-none focus-visible:ring-2 ring-emerald-400 ${className}`}
      >
        {flag && <span className="text-xl align-middle select-none">{flag}</span>}
        <span className="truncate">{name}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3" onClick={() => setIsOpen(false)}>
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
              <p className="text-sm font-black">
                {flag ? `${flag} ` : ""}
                {name}
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-black/10 px-2 py-1 text-xs font-bold hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-neutral-800"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3 p-4 text-sm">
              {loading && <p className="text-neutral-600 dark:text-neutral-300">Cargando datos del equipo...</p>}

              {!loading && error && <p className="text-rose-600 dark:text-rose-400">{error}</p>}

              {!loading && !error && summary && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 dark:border-white/10 dark:bg-neutral-800/60">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Grupo</p>
                      <p className="mt-1 font-black">{summary.group ?? "Sin grupo"}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 dark:border-white/10 dark:bg-neutral-800/60">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Partidos jugados</p>
                      <p className="mt-1 font-black">{summary.matchesPlayed}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 dark:border-white/10 dark:bg-neutral-800/60">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Goles a favor</p>
                      <p className="mt-1 font-black">{summary.goalsFor}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 dark:border-white/10 dark:bg-neutral-800/60">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Goles en contra</p>
                      <p className="mt-1 font-black">{summary.goalsConceded}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 dark:border-white/10 dark:bg-neutral-800/60">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Racha reciente</p>
                    <p className="mt-1 font-black">{summary.lastFive.length > 0 ? summary.lastFive.join(" ") : "Sin partidos cerrados"}</p>
                  </div>

                  <div className="rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 dark:border-white/10 dark:bg-neutral-800/60">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Próximo partido</p>
                    {summary.nextMatch ? (
                      <p className="mt-1 font-semibold">
                        {summary.nextMatch.opponentFlag} {summary.nextMatch.opponent} · {formatDate(summary.nextMatch.kickoffAt)} · {summary.nextMatch.stage}
                      </p>
                    ) : (
                      <p className="mt-1 font-semibold">Sin partidos pendientes</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
