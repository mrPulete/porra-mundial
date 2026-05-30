"use client";

import { buildBracketTree, type TournamentMatchLike } from "@/lib/tournament-tree";
import TeamLink from "./team/team-link";

type ScoreMap = Record<string, { home: string; away: string }>;

const columnSpacing: Record<string, string> = {
  round_of_32: "pt-0",
  round_of_16: "pt-10",
  quarter_final: "pt-20",
  semi_final: "pt-32",
  third_place: "pt-40",
  final: "pt-52",
};

export function BracketBoard({
  matches,
  liveScores,
  onPickMatch,
  visualOnly = false,
}: {
  matches: TournamentMatchLike[];
  liveScores?: ScoreMap;
  onPickMatch?: (match: TournamentMatchLike) => void;
  visualOnly?: boolean;
}) {
  const { rounds } = buildBracketTree(matches, liveScores);
  const byCode = new Map(matches.filter((match) => Boolean(match.code)).map((match) => [match.code as string, match]));

  return (
    <section className="overflow-x-auto pb-4">
      <div className="grid min-w-[1320px] grid-cols-6 gap-4">
        {rounds.map((round) => (
          <div key={round.key} className={`min-w-0 ${columnSpacing[round.key] ?? "pt-0"}`}>
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
              {round.label}
            </h2>

            <div className="space-y-4">
              {round.matches.map((match) => {
                const sourceMatch = byCode.get(match.code);
                const selectedScore = sourceMatch ? liveScores?.[sourceMatch.id] : undefined;

                return (
                  <article
                    key={match.code}
                    className="relative rounded-2xl border border-black/10 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900/90"
                  >
                    <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      <span>{match.code}</span>
                      <span>{match.winner ? "Clasificado" : "Pendiente"}</span>
                    </div>

                    <div className="space-y-2">
                      {[match.home, match.away].map((team, index) => (
                        <div
                          key={`${match.code}-${team ? team.name : index}`}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold ${
                            team
                              ? match.winner?.name === team.name
                                ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-100"
                                : "border-black/5 bg-neutral-50 dark:border-white/5 dark:bg-neutral-800"
                              : "border-dashed border-black/10 bg-neutral-100/70 text-neutral-400 dark:border-white/10 dark:bg-neutral-800/50"
                          }`}
                        >
                          <span className="truncate">
                            {team ? (
                              <TeamLink teamId={team.name} name={team.name} flag={team.flag} />
                            ) : index === 0 ? "Pendiente por definir" : "Pendiente por definir"}
                          </span>
                          <span className="ml-2 text-[11px] font-black uppercase tracking-wide">
                            {match.winner?.name === team?.name ? "Pasa" : ""}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">{match.label}</div>

                    {!visualOnly && (
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                          {selectedScore?.home !== undefined &&
                          selectedScore?.away !== undefined &&
                          selectedScore.home !== "" &&
                          selectedScore.away !== ""
                            ? `${selectedScore.home} - ${selectedScore.away}`
                            : "Sin resultado"}
                        </span>
                        <button
                          disabled={!sourceMatch || !onPickMatch}
                          onClick={() => {
                            if (sourceMatch && onPickMatch) {
                              onPickMatch(sourceMatch);
                            }
                          }}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                        >
                          Incluir resultado
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
