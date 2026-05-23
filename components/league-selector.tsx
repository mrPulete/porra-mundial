"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";

type League = {
  id: string;
  name: string;
  code: string;
};

export function LeagueSelector({ leagues, activeLeagueId }: { leagues: League[]; activeLeagueId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId);

  const selectLeague = (leagueId: string) => {
    document.cookie = `activeLeagueId=${leagueId}; path=/; max-age=31536000; samesite=lax`;
    setIsOpen(false);
    // Navigate to current path with ?leagueId=... to force reload with new league
    const current = window.location.pathname;
    router.push(`${current}?leagueId=${leagueId}`);
  };

  if (leagues.length === 0) {
    return (
      <Link
        href="/leagues"
        className="flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
      >
        <Plus size={14} />
        Liga
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-neutral-800"
      >
        <span className="truncate">{activeLeague?.name ?? "Selecciona"}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-40 space-y-1 rounded-lg border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-neutral-900">
          {leagues.map((league) => (
            <button
              type="button"
              key={league.id}
              onClick={() => selectLeague(league.id)}
              className={`block rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                league.id === activeLeagueId
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {league.name}
            </button>
          ))}
          <hr className="my-1 border-black/10 dark:border-white/10" />
          <Link
            href="/leagues"
            onClick={() => setIsOpen(false)}
            className="block rounded px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Plus className="mr-1 inline" size={12} /> Nueva liga
          </Link>
        </div>
      )}
    </div>
  );
}
