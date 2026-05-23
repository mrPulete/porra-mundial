"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "@/hooks/use-dark-mode";

export function NavBar() {
  const { data } = useSession();
  const { isDark, toggle } = useDarkMode();

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-neutral-950/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-black tracking-wide text-emerald-700 dark:text-emerald-400">
          PORRA MUNDIAL
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/matches">Partidos</Link>
          <Link href="/predictions">Resultados</Link>
          <Link href="/bracket">Bracket</Link>
          <Link href="/rankings">Rankings</Link>
          <Link href="/leagues">Ligas</Link>
          {data?.user?.role === "ADMIN" && <Link href="/admin">Admin</Link>}
          <button
            onClick={toggle}
            className="rounded-full border border-black/10 p-2 dark:border-white/20"
            aria-label="Cambiar tema"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {!data?.user ? (
            <Link href="/login" className="rounded-full bg-emerald-600 px-4 py-1.5 text-white">
              Entrar
            </Link>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-white dark:bg-neutral-100 dark:text-black"
            >
              Salir
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
