"use client";

import { useEffect } from "react";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function looksLikeDatabaseError(error: Error) {
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("prisma") ||
    msg.includes("database") ||
    msg.includes("db") ||
    msg.includes("postgres") ||
    msg.includes("connection") ||
    msg.includes("timeout") ||
    msg.includes("p10") ||
    msg.includes("p20")
  );
}

export default function Error({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("Error de aplicacion:", error);
  }, [error]);

  const isDbError = looksLikeDatabaseError(error);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-white/95 p-6 shadow-2xl dark:border-red-400/30 dark:bg-neutral-900/95">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-red-700 dark:text-red-300">Error</p>
        <h1 className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">
          {isDbError ? "Problema de conexion con la base de datos" : "Ha ocurrido un error inesperado"}
        </h1>
        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
          {isDbError
            ? "No se han podido cargar o guardar datos ahora mismo. Intenta de nuevo en unos segundos."
            : "La aplicacion encontro un problema al cargar esta pantalla. Puedes reintentar."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={reset}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-neutral-800 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </main>
  );
}
