"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { LeagueSelector } from "./league-selector";
import { useState } from "react";
import { usePathname } from "next/navigation";

type League = {
  id: string;
  name: string;
  code: string;
};

export function NavBarV2({ leagues = [], activeLeagueId }: { leagues?: League[]; activeLeagueId?: string }) {
  const { data } = useSession();
  const { isDark, toggle } = useDarkMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isAdmin = data?.user?.role === "ADMIN";
  const displayName = data?.user?.name || "Usuario";
  const userEmail = data?.user?.email || "";

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const navLinkClass = (href: string) => {
    const base = "rounded-lg px-3 py-1.5";
    if (isActive(href)) {
      return `${base} bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200`;
    }
    return `${base} hover:bg-neutral-100 dark:hover:bg-neutral-800`;
  };

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-neutral-950/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 text-lg font-black tracking-wide text-emerald-700 dark:text-emerald-400">
          ⚽
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden gap-1 text-sm font-semibold md:flex">
          <Link
            href="/predictions"
            className={navLinkClass("/predictions")}
          >
            Pronosticos
          </Link>
          <Link
            href="/matches"
            className={navLinkClass("/matches")}
          >
            Resultados
          </Link>
          <Link
            href="/rankings"
            className={navLinkClass("/rankings")}
          >
            Ranking
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={navLinkClass("/admin")}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* League Selector */}
          {data?.user && (
            <LeagueSelector leagues={leagues} activeLeagueId={activeLeagueId} />
          )}

          {data?.user && (
            <details className="relative hidden sm:block">
              <summary
                className="cursor-pointer list-none rounded-lg border border-black/10 bg-white/60 px-3 py-1.5 text-sm font-semibold dark:border-white/20 dark:bg-neutral-900/60"
                title={userEmail}
              >
                {displayName}
              </summary>
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-neutral-900">
                <p className="rounded-lg px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400" title={userEmail}>
                  {userEmail}
                </p>
                <p className="mt-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                  Perfil (proximamente)
                </p>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Salir
                </button>
              </div>
            </details>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggle}
            className="rounded-lg border border-black/10 p-1.5 dark:border-white/20"
            aria-label="Cambiar tema"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Auth Button */}
          {!data?.user ? (
            <Link
              href="/login"
              className="hidden rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 sm:inline-block"
            >
              Entrar
            </Link>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-bold text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-200 sm:inline-block"
            >
              Salir
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-1.5 md:hidden"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <nav className="border-t border-black/10 bg-white/95 dark:border-white/10 dark:bg-neutral-900/95 md:hidden">
          <div className="space-y-1 px-4 py-3">
            {data?.user && (
              <div className="mb-2 rounded-lg border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-neutral-800/60">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-neutral-600 dark:text-neutral-300">{userEmail}</p>
              </div>
            )}
            <Link
              href="/predictions"
              onClick={() => setMobileMenuOpen(false)}
              className={`block ${navLinkClass("/predictions")} font-semibold`}
            >
              Pronosticos
            </Link>
            <Link
              href="/matches"
              onClick={() => setMobileMenuOpen(false)}
              className={`block ${navLinkClass("/matches")} font-semibold`}
            >
              Resultados
            </Link>
            <Link
              href="/rankings"
              onClick={() => setMobileMenuOpen(false)}
              className={`block ${navLinkClass("/rankings")} font-semibold`}
            >
              Ranking
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`block ${navLinkClass("/admin")} font-semibold`}
              >
                Admin
              </Link>
            )}
            {!data?.user ? (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg bg-emerald-600 px-3 py-2 text-center font-bold text-white"
              >
                Entrar
              </Link>
            ) : (
              <button
                onClick={() => {
                  signOut({ callbackUrl: "/" });
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-center font-bold text-white dark:bg-neutral-100 dark:text-black"
              >
                Salir
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
