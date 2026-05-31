"use client";

import { useEffect, useState } from "react";

export default function TeamLink({ teamId, name, flag, className = "" }: { teamId: string; name: string; flag?: string; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const teamPath = `/teams/${encodeURIComponent(teamId)}`;

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
            className="relative h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900"
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

            <iframe
              src={teamPath}
              title={`Detalle de ${name}`}
              className="h-[calc(85vh-53px)] w-full border-0 bg-white dark:bg-neutral-900"
            />
          </div>
        </div>
      )}
    </>
  );
}
