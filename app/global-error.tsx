"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
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

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Error global:", error);
  }, [error]);

  const isDbError = looksLikeDatabaseError(error);

  return (
    <html lang="es">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,_#fee2e2_0%,_#fff7ed_38%,_#ffffff_100%)] text-neutral-900 dark:bg-[radial-gradient(circle_at_top,_#450a0a_0%,_#0a0a0a_40%,_#020617_100%)] dark:text-neutral-50">
        <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-white/95 p-6 shadow-2xl dark:border-red-400/30 dark:bg-neutral-900/95">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-700 dark:text-red-300">Error global</p>
            <h1 className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">
              {isDbError ? "No hay conexion con la base de datos" : "Se ha producido un error critico"}
            </h1>
            <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
              {isDbError
                ? "El sistema no puede acceder a los datos ahora mismo. Prueba a recargar o vuelve en unos minutos."
                : "No se pudo inicializar la aplicacion correctamente. Intenta recargar."}
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
      </body>
    </html>
  );
}
