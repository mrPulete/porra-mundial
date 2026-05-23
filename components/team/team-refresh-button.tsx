"use client";

import { useState } from "react";

export default function TeamRefreshButton({ teamCode }: { teamCode: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/${teamCode}/football-data`, { method: "POST" });
      if (res.ok) {
        setMessage("Datos actualizados");
        setTimeout(() => window.location.reload(), 500);
      } else {
        setMessage("Error al actualizar");
      }
    } catch {
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline disabled:opacity-50"
      >
        {loading ? "Actualizando..." : "↻ Actualizar datos externos"}
      </button>
      {message && <span className="text-[10px] text-neutral-400">{message}</span>}
    </div>
  );
}
