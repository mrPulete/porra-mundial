"use client";

import { useRouter } from "next/navigation";

type League = {
  id: string;
  name: string;
  code: string;
};

export function HomeLeagueLinks({ leagues }: { leagues: League[] }) {
  const router = useRouter();

  const openLeagueRanking = (leagueId: string) => {
    document.cookie = `activeLeagueId=${leagueId}; path=/; max-age=31536000; samesite=lax`;
    router.push("/rankings");
    router.refresh();
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {leagues.map((league) => (
        <button
          type="button"
          key={league.id}
          onClick={() => openLeagueRanking(league.id)}
          className="rounded-lg border border-black/10 bg-white/50 p-4 text-left hover:bg-white/80 dark:border-white/10 dark:bg-neutral-900/50 dark:hover:bg-neutral-900/80"
        >
          <h3 className="font-black">{league.name}</h3>
          <p className="text-xs text-neutral-500">Codigo: {league.code}</p>
          <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Abrir ranking de esta liga</p>
        </button>
      ))}
    </div>
  );
}