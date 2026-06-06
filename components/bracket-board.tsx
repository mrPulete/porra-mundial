"use client";

import { buildBracketTree, type TournamentMatchLike } from "@/lib/tournament-tree";
import TeamLink from "./team/team-link";
import { type CSSProperties, useEffect, useState } from "react";
import type { ScoringSettings } from "@/lib/scoring-settings";

type ScoreMap = Record<string, { home: string; away: string }>;
type QualifierMap = Record<string, string>;
type ResolvedTeam = { name: string; flag: string; teamId?: string } | null;

type EditingContext = {
  sourceMatch: TournamentMatchLike;
  home: ResolvedTeam;
  away: ResolvedTeam;
  code: string;
};

const columnSpacing: Record<string, string> = {
  round_of_32: "pt-0",
  round_of_16: "pt-0",
  quarter_final: "pt-0",
  semi_final: "pt-0",
  third_place: "pt-0",
  final: "pt-0",
};

const roundVerticalSpacing: Record<string, string> = {
  round_of_32: "space-y-8",
  round_of_16: "space-y-16",
  quarter_final: "space-y-28",
  semi_final: "space-y-40",
  third_place: "space-y-14",
  final: "space-y-14",
};

const pairVerticalSpacing: Record<string, string> = {
  round_of_32: "space-y-4",
  round_of_16: "space-y-8",
  quarter_final: "space-y-12",
  semi_final: "space-y-16",
};

const roundColumnWidth: Record<string, string> = {
  round_of_32: "min-w-[250px]",
  round_of_16: "min-w-[300px]",
  quarter_final: "min-w-[340px]",
  semi_final: "min-w-[380px]",
  third_place: "min-w-[340px]",
  final: "min-w-[380px]",
};

const roundCardSize: Record<string, string> = {
  round_of_32: "h-[252px] p-3",
  round_of_16: "h-[272px] p-3.5",
  quarter_final: "h-[300px] p-4",
  semi_final: "h-[332px] p-4",
  third_place: "h-[320px] p-4",
  final: "h-[340px] p-4",
};

const roundTeamRowSize: Record<string, string> = {
  round_of_32: "py-2",
  round_of_16: "py-2.5",
  quarter_final: "py-3",
  semi_final: "py-3",
  third_place: "py-3",
  final: "py-3",
};

const roundTeamNameWidth: Record<string, string> = {
  round_of_32: "max-w-[13rem]",
  round_of_16: "max-w-[14rem]",
  quarter_final: "max-w-[15rem]",
  semi_final: "max-w-[16rem]",
  third_place: "max-w-[15rem]",
  final: "max-w-[16rem]",
};

const roundConnectorOffset: Record<string, string> = {
  round_of_32: "-right-8",
  round_of_16: "-right-10",
  quarter_final: "-right-12",
  semi_final: "-right-14",
};

const knockoutRoundOrder = ["round_of_32", "round_of_16", "quarter_final", "semi_final"] as const;

const knockoutRoundDepth: Record<(typeof knockoutRoundOrder)[number], number> = {
  round_of_32: 0,
  round_of_16: 1,
  quarter_final: 2,
  semi_final: 3,
};

const roundCardHeightPx: Record<string, number> = {
  round_of_32: 220,
  round_of_16: 240,
  quarter_final: 272,
  semi_final: 304,
  third_place: 300,
  final: 320,
};

const baseCenterStepPx = 260;
const knockoutCanvasHeightPx = baseCenterStepPx * 16;

const THIRDS_STORAGE_KEY = "porra.thirds.order";

export function BracketBoard({
  matches,
  liveScores,
  liveQualifiers,
  thirdOrderOverride,
  onLiveScoresChange,
  onLiveQualifiersChange,
  onPickMatch,
  scoringSettings,
  visualOnly = false,
}: {
  matches: TournamentMatchLike[];
  liveScores?: ScoreMap;
  liveQualifiers?: QualifierMap;
  thirdOrderOverride?: string[];
  onLiveScoresChange?: (nextScores: ScoreMap | ((prev: ScoreMap) => ScoreMap)) => void;
  onLiveQualifiersChange?: (nextQualifiers: QualifierMap | ((prev: QualifierMap) => QualifierMap)) => void;
  onPickMatch?: (match: TournamentMatchLike) => void;
  scoringSettings?: ScoringSettings;
  visualOnly?: boolean;
}) {
  const [thirdOrder, setThirdOrder] = useState<string[]>([]);
  const [localScores, setLocalScores] = useState<ScoreMap>({});
  const [localQualifiers, setLocalQualifiers] = useState<QualifierMap>({});
  const [editingMatch, setEditingMatch] = useState<EditingContext | null>(null);
  const [draftHome, setDraftHome] = useState("");
  const [draftAway, setDraftAway] = useState("");
  const [draftQualifier, setDraftQualifier] = useState("");

  // Leer el orden de terceros del localStorage al montar (fallback cuando no llega override externo)
  useEffect(() => {
    if (thirdOrderOverride) {
      return;
    }

    const stored = window.localStorage.getItem(THIRDS_STORAGE_KEY);
    if (stored) {
      try {
        setThirdOrder(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing thirds order from localStorage:", e);
      }
    }
  }, []);

  // Escuchar cambios del localStorage (desde otras tabs/windows)
  useEffect(() => {
    if (thirdOrderOverride) {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THIRDS_STORAGE_KEY && e.newValue) {
        try {
          setThirdOrder(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Error parsing thirds order:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const scoreSource = liveScores ?? localScores;
  const qualifierSource = liveQualifiers ?? localQualifiers;

  const setScoreMap = (updater: (prev: ScoreMap) => ScoreMap) => {
    if (onLiveScoresChange) {
      onLiveScoresChange(updater);
      return;
    }

    setLocalScores(updater);
  };

  const setQualifierMap = (updater: (prev: QualifierMap) => QualifierMap) => {
    if (onLiveQualifiersChange) {
      onLiveQualifiersChange(updater);
      return;
    }

    setLocalQualifiers(updater);
  };

  const effectiveThirdOrder = thirdOrderOverride ?? thirdOrder;

  // Check if all GROUP matches are finished
  const groupMatches = matches.filter((match) => match.stage === "GROUP");
  const isGroupStageFinished = groupMatches.length > 0 && groupMatches.every((match) => match.isFinished);

  // Check if any KNOCKOUT match has started (is finished)
  const knockoutMatches = matches.filter((match) => match.stage !== "GROUP" && match.stage !== "THIRD_PLACE");
  const isKnockoutStarted = knockoutMatches.some((match) => match.isFinished);

  // When GROUP is finished but KNOCKOUT hasn't started, show real qualified teams
  const showRealTeams = isGroupStageFinished && !isKnockoutStarted;

  const { rounds } = buildBracketTree(matches, scoreSource, effectiveThirdOrder, qualifierSource, showRealTeams);
  const byCode = new Map(matches.filter((match) => Boolean(match.code)).map((match) => [match.code as string, match]));

  useEffect(() => {
    const invalidMatchIds = new Set<string>();

    for (const round of rounds) {
      for (const match of round.matches) {
        const sourceMatch = byCode.get(match.code);
        if (!sourceMatch) {
          continue;
        }

        const homeResolved = Boolean(match.home?.teamId);
        const awayResolved = Boolean(match.away?.teamId);
        if (!homeResolved || !awayResolved) {
          invalidMatchIds.add(sourceMatch.id);
        }
      }
    }

    if (invalidMatchIds.size === 0) {
      return;
    }

    const hasInvalidScores = Object.keys(scoreSource).some((id) => invalidMatchIds.has(id));
    const hasInvalidQualifiers = Object.keys(qualifierSource).some((id) => invalidMatchIds.has(id));

    if (hasInvalidScores) {
      setScoreMap((prev) => {
        const next = { ...prev };
        for (const matchId of invalidMatchIds) {
          delete next[matchId];
        }
        return next;
      });
    }

    if (hasInvalidQualifiers) {
      setQualifierMap((prev) => {
        const next = { ...prev };
        for (const matchId of invalidMatchIds) {
          delete next[matchId];
        }
        return next;
      });
    }
  }, [byCode, qualifierSource, rounds, scoreSource]);

  useEffect(() => {
    if (!editingMatch) {
      return;
    }

    const selected = scoreSource[editingMatch.sourceMatch.id];
    setDraftHome(selected?.home ?? "");
    setDraftAway(selected?.away ?? "");
    setDraftQualifier(qualifierSource[editingMatch.sourceMatch.id] ?? "");
  }, [editingMatch, qualifierSource, scoreSource]);

  const openEditor = (sourceMatch: TournamentMatchLike, home: ResolvedTeam, away: ResolvedTeam, code: string) => {
    if (onPickMatch) {
      onPickMatch(sourceMatch);
      return;
    }

    setEditingMatch({ sourceMatch, home, away, code });
  };

  const closeEditor = () => {
    setEditingMatch(null);
    setDraftHome("");
    setDraftAway("");
    setDraftQualifier("");
  };

  const formatKickoffDate = (value: Date | string) =>
    new Date(value).toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
      timeZone: "Europe/Madrid",
    }).toUpperCase();

  const formatKickoffTime = (value: Date | string) =>
    new Date(value).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    });

  const saveEditor = () => {
    if (!editingMatch) {
      return;
    }

    if (!editingMatch.home?.teamId || !editingMatch.away?.teamId) {
      closeEditor();
      return;
    }

    if (draftHome === "" || draftAway === "") {
      setScoreMap((prev) => {
        const next = { ...prev };
        delete next[editingMatch.sourceMatch.id];
        return next;
      });
      setQualifierMap((prev) => {
        const next = { ...prev };
        delete next[editingMatch.sourceMatch.id];
        return next;
      });
      closeEditor();
      return;
    }

    const home = Number(draftHome);
    const away = Number(draftAway);

    if (Number.isNaN(home) || Number.isNaN(away) || home < 0 || away < 0) {
      return;
    }

    setScoreMap((prev) => ({
      ...prev,
      [editingMatch.sourceMatch.id]: {
        home: String(home),
        away: String(away),
      },
    }));

    if (home === away && draftQualifier) {
      setQualifierMap((prev) => ({
        ...prev,
        [editingMatch.sourceMatch.id]: draftQualifier,
      }));
    } else {
      setQualifierMap((prev) => {
        const next = { ...prev };
        delete next[editingMatch.sourceMatch.id];
        return next;
      });
    }

    closeEditor();
  };

  const renderMatchCard = (
    roundKey: string,
    match: (typeof rounds)[number]["matches"][number],
    options?: { showRightStub?: boolean; className?: string; style?: CSSProperties }
  ) => {
    const sourceMatch = byCode.get(match.code);
    const hasBothTeamsResolved = Boolean(match.home?.teamId && match.away?.teamId);
    const selectedScore = sourceMatch && hasBothTeamsResolved ? scoreSource[sourceMatch.id] : undefined;
    const selectedQualifier = sourceMatch && hasBothTeamsResolved ? qualifierSource[sourceMatch.id] : undefined;
    const hasScore = Boolean(hasBothTeamsResolved && selectedScore?.home !== "" && selectedScore?.away !== "" && selectedScore);
    const isDraw = hasScore && selectedScore?.home === selectedScore?.away;
    const hasResolvedWinner = Boolean(hasScore && (!isDraw || selectedQualifier));
    const canEditMatch = Boolean(sourceMatch && hasBothTeamsResolved);
    const homeScoreTag = hasScore ? selectedScore?.home ?? "" : "";
    const awayScoreTag = hasScore ? selectedScore?.away ?? "" : "";

    const showRightStub =
      options?.showRightStub ?? (roundKey !== "final" && roundKey !== "third_place");

    return (
      <article
        key={match.code}
        className={`relative flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white/90 shadow-sm dark:border-white/10 dark:bg-neutral-900/90 ${roundCardSize[roundKey] ?? "h-[272px] p-3"} ${options?.className ?? ""}`}
        style={options?.style}
      >
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <span>{match.code}</span>
        </div>

        <div className="min-h-[84px] space-y-2">
          {[match.home, match.away].map((team, index) => (
            <div
              key={`${match.code}-${team ? team.name : index}`}
              className={`flex items-center justify-between rounded-xl border px-3 text-sm font-semibold ${roundTeamRowSize[roundKey] ?? "py-2"} ${
                team
                  ? (visualOnly ? match.winner?.name === team.name : hasResolvedWinner && match.winner?.name === team.name)
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-100"
                    : "border-black/5 bg-neutral-50 dark:border-white/5 dark:bg-neutral-800"
                  : "border-dashed border-black/10 bg-neutral-100/70 text-neutral-400 dark:border-white/10 dark:bg-neutral-800/50"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                {team ? (
                  <TeamLink teamId={team.teamId ?? team.name} name={team.name} flag={team.flag} className={`${roundTeamNameWidth[roundKey] ?? "max-w-[14rem]"} truncate text-xs leading-tight`} />
                ) : index === 0 ? "Pendiente por definir" : "Pendiente por definir"}
              </div>
              <div className="ml-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-200/80 text-xs font-black dark:bg-neutral-700">
                  {index === 0 ? homeScoreTag : awayScoreTag}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 min-h-[42px]">
          <div className="line-clamp-1 text-[11px] text-neutral-500 dark:text-neutral-400">{match.label}</div>
          {sourceMatch?.kickoffAt ? (
            <p className="mt-1 line-clamp-2 text-[10px] text-neutral-500 dark:text-neutral-400">
              {formatKickoffDate(sourceMatch.kickoffAt)}
              {" · "}
              {formatKickoffTime(sourceMatch.kickoffAt)}
              {" · "}
              {sourceMatch.stadium || "Sede por confirmar"}
              {sourceMatch.city ? `, ${sourceMatch.city}` : ""}
            </p>
          ) : null}
        </div>

        {!visualOnly && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
              {hasScore ? (
                (roundKey === "third_place" || roundKey === "final") && hasResolvedWinner ? (
                  <span className="text-emerald-700 dark:text-emerald-300">Ganador {match.winner?.name ?? "pendiente"}</span>
                ) : isDraw && selectedQualifier ? (
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {roundKey === "third_place" || roundKey === "final" ? "Ganador " : "Clasifica "}
                    {match.home?.teamId === selectedQualifier ? match.home.name : match.away?.teamId === selectedQualifier ? match.away.name : "pendiente"}
                  </span>
                ) : (
                  <span>Resultado cargado</span>
                )
              ) : (
                <span>Sin resultado</span>
              )}
            </div>
            <button
              disabled={!canEditMatch}
              onClick={() => {
                if (sourceMatch && match.home && match.away) {
                  openEditor(sourceMatch, match.home, match.away, match.code);
                }
              }}
              className="rounded-lg border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              {canEditMatch ? "Incluir resultado" : "Pendiente"}
            </button>
          </div>
        )}

        {!visualOnly ? (
          <div className="mt-2 min-h-[26px]">
            {sourceMatch?.isFinished && hasScore && scoringSettings && selectedScore ? (
              <div className="rounded-lg bg-neutral-100/80 px-2 py-1 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200">
                {(() => {
                  const home = Number(selectedScore.home);
                  const away = Number(selectedScore.away);
                  const actualHome = sourceMatch.homeScore;
                  const actualAway = sourceMatch.awayScore;

                  if (Number.isNaN(home) || Number.isNaN(away) || actualHome === null || actualAway === null) {
                    return "Puntos: pendientes";
                  }

                  let points = 0;
                  if (home === actualHome) {
                    points += scoringSettings.homeGoalsHit;
                  }
                  if (away === actualAway) {
                    points += scoringSettings.awayGoalsHit;
                  }

                  return `Puntos por partido: ${points}`;
                })()}
              </div>
            ) : (
              <div className="rounded-lg px-2 py-1 text-[11px] opacity-0">Puntos por partido: 0</div>
            )}
          </div>
        ) : null}

        {showRightStub ? (
          <span className="absolute -right-4 top-1/2 h-px w-4 -translate-y-1/2 bg-black/20 dark:bg-white/30" />
        ) : null}
      </article>
    );
  };

  return (
    <>
      {showRealTeams && (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-semibold">⚠️ Equipos clasificados actualizados</p>
          <p className="mt-1 text-xs">Puedes cambiar tus predicciones de resultados (-2 pts por cambio) hasta que empiece la ronda de 32avos.</p>
        </div>
      )}

      <section className="overflow-x-auto pb-4">
        <div className="grid min-w-[2260px] grid-cols-6 gap-12">
        {rounds.map((round) => (
          <div key={round.key} className={`min-w-0 ${roundColumnWidth[round.key] ?? "min-w-[250px]"} ${columnSpacing[round.key] ?? "pt-0"}`}>
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
              {round.label}
            </h2>

            {knockoutRoundOrder.includes(round.key as (typeof knockoutRoundOrder)[number]) ? (
              (() => {
                const depth = knockoutRoundDepth[round.key as (typeof knockoutRoundOrder)[number]];
                const centerStep = baseCenterStepPx * 2 ** depth;
                const connectorWidth = 44 + depth * 8;

                return (
                  <div className="relative" style={{ height: `${knockoutCanvasHeightPx}px` }}>
                    {round.matches.map((match, matchIndex) => {
                      const cardHeight = roundCardHeightPx[round.key] ?? 240;
                      const centerY = centerStep * (matchIndex + 0.5);
                      const topY = centerY - cardHeight / 2;

                      return (
                        <div key={match.code} className="absolute left-0 right-6 z-10" style={{ top: `${topY}px` }}>
                          {renderMatchCard(round.key, match, { showRightStub: false })}
                        </div>
                      );
                    })}

                    {Array.from({ length: Math.ceil(round.matches.length / 2) }).map((_, pairIndex) => {
                      const firstIndex = pairIndex * 2;
                      const secondIndex = firstIndex + 1;
                      if (!round.matches[secondIndex]) {
                        return null;
                      }

                      const y1 = centerStep * (firstIndex + 0.5);
                      const y2 = centerStep * (secondIndex + 0.5);
                      const segmentHeight = y2 - y1;

                      return (
                        <div
                          key={`${round.key}-curve-${pairIndex}`}
                          className="pointer-events-none absolute z-0"
                          style={{
                            right: `-${Math.round(connectorWidth * 0.6)}px`,
                            top: `${y1}px`,
                            width: `${connectorWidth}px`,
                            height: `${segmentHeight}px`,
                          }}
                        >
                          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                            <path
                              d="M0 0 C46 0 42 50 74 50"
                              fill="none"
                              className="stroke-black/20 dark:stroke-white/30"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                            <path
                              d="M0 100 C46 100 42 50 74 50"
                              fill="none"
                              className="stroke-black/20 dark:stroke-white/30"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                            <path
                              d="M74 50 C84 50 92 50 100 50"
                              fill="none"
                              className="stroke-black/20 dark:stroke-white/30"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : round.key === "third_place" || round.key === "final" ? (
              (() => {
                const match = round.matches[0];
                if (!match) {
                  return null;
                }

                const cardHeight = roundCardHeightPx[round.key] ?? 300;
                const semifinalCenterStep = baseCenterStepPx * 2 ** knockoutRoundDepth.semi_final;
                const topSemiCenter = semifinalCenterStep * 0.5;
                const bottomSemiCenter = semifinalCenterStep * 1.5;
                const sharedCenter = (topSemiCenter + bottomSemiCenter) / 2;
                const topY = sharedCenter - cardHeight / 2;

                return (
                  <div className="relative" style={{ height: `${knockoutCanvasHeightPx}px` }}>
                    <div className="absolute left-0 right-0 z-10" style={{ top: `${topY}px` }}>
                      {renderMatchCard(round.key, match, { showRightStub: false })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className={roundVerticalSpacing[round.key] ?? "space-y-6"}>
                {Array.from({ length: Math.ceil(round.matches.length / 2) }).map((_, pairIndex) => {
                  const firstMatch = round.matches[pairIndex * 2];
                  const secondMatch = round.matches[pairIndex * 2 + 1];

                  return (
                    <div key={`${round.key}-pair-${pairIndex}`} className={`relative ${roundConnectorOffset[round.key] === "-right-14" ? "pr-14" : roundConnectorOffset[round.key] === "-right-12" ? "pr-12" : roundConnectorOffset[round.key] === "-right-10" ? "pr-10" : "pr-8"} ${pairVerticalSpacing[round.key] ?? "space-y-4"}`}>
                      {secondMatch ? (
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className={`pointer-events-none absolute top-0 h-full ${roundConnectorOffset[round.key] ?? "-right-8"} w-12`}
                        >
                          <path
                            d="M0 25 C40 25 40 50 70 50"
                            fill="none"
                            className="stroke-black/20 dark:stroke-white/30"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                          />
                          <path
                            d="M0 75 C40 75 40 50 70 50"
                            fill="none"
                            className="stroke-black/20 dark:stroke-white/30"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                          />
                          <path
                            d="M70 50 C82 50 90 50 100 50"
                            fill="none"
                            className="stroke-black/20 dark:stroke-white/30"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>
                      ) : null}

                      {firstMatch ? renderMatchCard(round.key, firstMatch, { showRightStub: !secondMatch }) : null}
                      {secondMatch ? renderMatchCard(round.key, secondMatch, { showRightStub: false }) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        </div>
      </section>

      {editingMatch ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={closeEditor}>
          <div
            className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-black">Selecciona resultado</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {editingMatch.home?.name ?? "Por definir"} vs {editingMatch.away?.name ?? "Por definir"}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {editingMatch.sourceMatch.kickoffAt
                ? new Date(editingMatch.sourceMatch.kickoffAt).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Madrid" })
                : "Fecha por confirmar"}
              {" · "}
              {editingMatch.sourceMatch.kickoffAt
                ? new Date(editingMatch.sourceMatch.kickoffAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
                : "--:--"}
              {" · "}
              {editingMatch.sourceMatch.stadium || "Sede por confirmar"}
              {editingMatch.sourceMatch.city ? `, ${editingMatch.sourceMatch.city}` : ""}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {editingMatch.home?.name ?? "Por definir"}
                <select
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  value={draftHome}
                  onChange={(event) => setDraftHome(event.target.value)}
                >
                  <option value="">-</option>
                  {Array.from({ length: 11 }, (_, index) => (
                    <option key={index} value={String(index)}>
                      {index}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {editingMatch.away?.name ?? "Por definir"}
                <select
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  value={draftAway}
                  onChange={(event) => setDraftAway(event.target.value)}
                >
                  <option value="">-</option>
                  {Array.from({ length: 11 }, (_, index) => (
                    <option key={index} value={String(index)}>
                      {index}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {draftHome !== "" && draftAway !== "" && draftHome === draftAway ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Si hay empate, ¿quién clasifica?</p>
                <select
                  value={draftQualifier}
                  onChange={(event) => setDraftQualifier(event.target.value)}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                >
                  <option value="">Sin seleccionar</option>
                  {editingMatch.home?.teamId ? (
                    <option value={editingMatch.home.teamId}>{editingMatch.home.name}</option>
                  ) : null}
                  {editingMatch.away?.teamId ? (
                    <option value={editingMatch.away.teamId}>{editingMatch.away.name}</option>
                  ) : null}
                </select>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-3 gap-1">
              {[
                { home: "1", away: "0" },
                { home: "1", away: "1" },
                { home: "0", away: "1" },
                { home: "2", away: "1" },
                { home: "2", away: "2" },
                { home: "1", away: "2" },
              ].map((score) => (
                <button
                  key={`${score.home}-${score.away}`}
                  onClick={() => {
                    setDraftHome(score.home);
                    setDraftAway(score.away);
                  }}
                  className="rounded border border-black/10 px-2 py-1 text-xs font-bold hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-neutral-800"
                >
                  {score.home}-{score.away}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!editingMatch) {
                    return;
                  }

                  setScoreMap((prev) => {
                    const next = { ...prev };
                    delete next[editingMatch.sourceMatch.id];
                    return next;
                  });
                  setQualifierMap((prev) => {
                    const next = { ...prev };
                    delete next[editingMatch.sourceMatch.id];
                    return next;
                  });
                  closeEditor();
                }}
                className="mr-auto rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                Borrar resultado
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-bold dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEditor}
                disabled={
                  draftHome === "" ||
                  draftAway === "" ||
                  (draftHome === draftAway && !draftQualifier)
                }
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
