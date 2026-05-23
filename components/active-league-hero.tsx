type ActiveLeagueHeroProps = {
  name: string;
  code: string;
  description: string;
};

export function ActiveLeagueHero({ name, code, description }: ActiveLeagueHeroProps) {
  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(5,150,105,0.14),rgba(255,255,255,0.9))] p-5 shadow-sm dark:border-emerald-400/20 dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(23,23,23,0.92))]">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
        Liga activa
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-950 dark:text-white">{name}</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-700 dark:text-neutral-300">{description}</p>
        </div>
        <div className="rounded-2xl border border-emerald-600/20 bg-white/80 px-4 py-3 text-right dark:border-emerald-300/20 dark:bg-black/20">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
            Codigo para compartir
          </p>
          <p className="mt-1 font-mono text-2xl font-black tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            {code}
          </p>
        </div>
      </div>
    </section>
  );
}