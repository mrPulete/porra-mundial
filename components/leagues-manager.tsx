"use client";

import { useState } from "react";

type LeagueItem = {
  id: string;
  name: string;
  code: string;
  ownerName: string;
  membersCount: number;
};

export function LeaguesManager({
  initialLeagues,
  isAdmin = false,
}: {
  initialLeagues: LeagueItem[];
  isAdmin?: boolean;
}) {
  const [leagues] = useState(initialLeagues);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshLeagues = () => window.location.reload();

  const createLeague = async () => {
    if (!newLeagueName.trim()) {
      setMessage("Escribe un nombre para la liga");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLeagueName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "No se pudo crear la liga");
      } else {
        setMessage(`Liga creada: código ${data.league.code}`);
        setNewLeagueName("");
        refreshLeagues();
      }
    } catch {
      setMessage("Error de red al crear liga");
    } finally {
      setLoading(false);
    }
  };

  const joinLeague = async () => {
    if (!joinCode.trim()) {
      setMessage("Escribe un código");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "No se pudo unir a la liga");
      } else {
        window.location.href = "/predictions";
      }
    } catch {
      setMessage("Error de red al unirte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {isAdmin && (
          <section className="rounded-3xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-neutral-900/70">
            <h2 className="font-black">Crear liga</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Crea una liga privada y comparte el código con tus amigos.
            </p>
            <input
              placeholder="Nombre de liga"
              className="mt-3 w-full rounded-xl border px-3 py-2"
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
            />
            <button
              onClick={createLeague}
              disabled={loading}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50"
            >
              Nueva liga
            </button>
          </section>
        )}
        <section className="rounded-3xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-neutral-900/70">
          <h2 className="font-black">Unirte por código</h2>
          <input
            placeholder="Código de liga"
            className="mt-3 w-full rounded-xl border px-3 py-2 uppercase"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button
            onClick={joinLeague}
            disabled={loading}
            className="mt-3 rounded-xl bg-neutral-900 px-4 py-2 font-bold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-black"
          >
            Unirme
          </button>
        </section>
      </div>

      {message && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{message}</p>}

      <section className="rounded-3xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-neutral-900/70">
        <h2 className="font-black">Mis ligas</h2>
        {leagues.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Aún no perteneces a ninguna liga.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {leagues.map((league) => (
              <li key={league.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="font-bold">{league.name}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Código: {league.code} · Creador: {league.ownerName} · Miembros: {league.membersCount}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
