"use client";

import { useMemo, useState } from "react";

type MatchRow = {
  id: string;
  stage: string;
  group: string | null;
  code: string | null;
  kickoffAt: string;
  homeName: string;
  homeFlag: string;
  awayName: string;
  awayFlag: string;
  isFinished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  predictedOutcome: "1" | "X" | "2" | null;
};

export function PredictionsBoard({ matches }: { matches: MatchRow[] }) {
  const [values, setValues] = useState<Record<string, "1" | "X" | "2">>(() => {
    const init: Record<string, "1" | "X" | "2"> = {};
    for (const match of matches) {
      if (match.predictedOutcome) {
        init[match.id] = match.predictedOutcome;
      }
    }
    return init;
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const match of matches) {
      const key = `${match.stage}${match.group ? ` · Grupo ${match.group}` : ""}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(match);
    }
    return [...map.entries()];
  }, [matches]);

  const save = async () => {
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        predictions: Object.entries(values).map(([matchId, outcome]) => ({
          matchId,
          outcome,
        })),
      };

      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "No se pudieron guardar");
      } else {
        setMessage("Predicciones guardadas");
      }
    } catch {
      setMessage("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Flujo 1X2 inspirado en Excel: 1 = local, X = empate, 2 = visitante.
        </p>
      </div>

      {grouped.map(([label, stageMatches]) => (
        <section key={label} className="rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-neutral-900/70">
          <h2 className="text-lg font-black">{label.replaceAll("_", " ")}</h2>
          <div className="mt-3 space-y-2">
            {stageMatches.map((match) => (
              <article key={match.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                  <span>{match.code ?? ""}</span>
                  <span>{new Date(match.kickoffAt).toLocaleString()}</span>
                </div>
                <p className="font-semibold">
                  {match.homeFlag} {match.homeName} vs {match.awayFlag} {match.awayName}
                </p>
                <div className="mt-2 flex gap-2">
                  {(["1", "X", "2"] as const).map((o) => (
                    <button
                      key={o}
                      onClick={() => setValues((prev) => ({ ...prev, [match.id]: o }))}
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                        values[match.id] === o
                          ? "bg-emerald-600 text-white"
                          : "bg-neutral-100 dark:bg-neutral-800"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                {match.isFinished && (
                  <p className="mt-2 text-xs text-neutral-500">
                    Resultado: {match.homeScore} - {match.awayScore}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar predicciones"}
        </button>
        {message && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{message}</p>}
      </div>
    </div>
  );
}
