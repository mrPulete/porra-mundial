"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildBracketTree, buildGroupStandings, buildThirdPlaceRanking, type TeamSnapshot } from "@/lib/tournament-tree";
import type { ScoringSettings } from "@/lib/scoring-settings";
import type { PredictionEditPolicy } from "@/lib/prediction-edit-policy";
import TeamLink from "./team/team-link";
import { BracketBoard } from "@/components/bracket-board";

const DEFAULT_SCORING: ScoringSettings = {
  homeGoalsHit: 1,
  awayGoalsHit: 1,
  groupOrderHit: 6,
  knockoutQualifierHit: 8,
  bonusQuestionDefault: 3,
  miscExtra: 1,
};

function calculateMatchPoints(
  predicted: { home: number; away: number } | null,
  actual: { home: number | null; away: number | null },
  settings: ScoringSettings
): { points: number; breakdown: string } {
  if (!predicted || actual.home === null || actual.away === null) {
    return { points: 0, breakdown: "Sin datos" };
  }

  let points = 0;
  const parts: string[] = [];

  if (predicted.home === actual.home) {
    points += settings.homeGoalsHit;
    parts.push(`+${settings.homeGoalsHit}H`);
  }

  if (predicted.away === actual.away) {
    points += settings.awayGoalsHit;
    parts.push(`+${settings.awayGoalsHit}A`);
  }

  return {
    points,
    breakdown: parts.length > 0 ? parts.join(" ") : "0pts",
  };
}

type MatchRow = {
  id: string;
  stage: string;
  group: string | null;
  code: string | null;
  kickoffAt: string;
  stadium: string;
  city: string;
  homeName: string;
  homeFlag: string;
  homeTeamId: string;
  homeTeamCode: string;
  awayName: string;
  awayFlag: string;
  awayTeamId: string;
  awayTeamCode: string;
  isFinished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  predictedHome: number | null;
  predictedAway: number | null;
  predictedQualifiedTeamId: string | null;
  predictedOutcome: "1" | "X" | "2" | null;
  officialPredictedHome?: number | null;
  officialPredictedAway?: number | null;
  officialPredictedQualifiedTeamId?: string | null;
};

type PickableMatch = Pick<MatchRow, "id" | "stage" | "kickoffAt" | "stadium" | "city"> & {
  homeTeam: TeamSnapshot | null;
  awayTeam: TeamSnapshot | null;
};

type BonusQuestionRow = {
  id: string;
  question: string;
  options: unknown;
  deadline: string;
  answer: unknown;
  officialAnswer?: unknown;
};

type QuestionOption = {
  value: string;
  label: string;
};

const MAIN_SECTIONS = [
  { value: "GROUPS", label: "Grupos" },
  { value: "THIRDS", label: "Mejores terceros" },
  { value: "KNOCKOUT", label: "Eliminatorias" },
  { value: "QUESTIONS", label: "Preguntas" },
] as const;

const MAIN_SECTIONS_WITHOUT_QUESTIONS = MAIN_SECTIONS.filter((section) => section.value !== "QUESTIONS");

const THIRDS_STORAGE_KEY = "porra.thirds.order";

type SubmissionStatus = "DRAFT" | "OFFICIAL";
type SubmissionWindowStatus = "OPEN" | "LOCKED" | "REOPENED";

function isKnockoutStage(stage: string) {
  return stage !== "GROUP" && stage !== "THIRD_PLACE";
}

function normalizeQualifierForScore(
  match: Pick<MatchRow, "stage"> | undefined,
  score: { home: string; away: string },
  qualifier: string
) {
  if (!match || !isKnockoutStage(match.stage)) {
    return "";
  }

  if (score.home === "" || score.away === "") {
    return "";
  }

  if (score.home !== score.away) {
    return "";
  }

  return qualifier;
}

function normalizeQualifierMap(
  matchesById: Map<string, MatchRow>,
  values: Record<string, { home: string; away: string }>,
  qualifierValues: Record<string, string>
) {
  const normalized: Record<string, string> = {};
  const matchIds = new Set([...Object.keys(values), ...Object.keys(qualifierValues)]);

  for (const matchId of matchIds) {
    const match = matchesById.get(matchId);
    const score = values[matchId] ?? { home: "", away: "" };
    const qualifier = qualifierValues[matchId] ?? "";
    normalized[matchId] = normalizeQualifierForScore(match, score, qualifier);
  }

  return normalized;
}

function buildInitialScoreValues(matches: MatchRow[]) {
  const init: Record<string, { home: string; away: string }> = {};
  for (const match of matches) {
    init[match.id] = {
      home: match.predictedHome?.toString() ?? "",
      away: match.predictedAway?.toString() ?? "",
    };
  }
  return init;
}

function buildOfficialScoreValues(matches: MatchRow[]) {
  const init: Record<string, { home: string; away: string }> = {};
  for (const match of matches) {
    init[match.id] = {
      home: match.officialPredictedHome?.toString() ?? "",
      away: match.officialPredictedAway?.toString() ?? "",
    };
  }
  return init;
}

function buildInitialQualifierValues(matches: MatchRow[]) {
  const init: Record<string, string> = {};
  for (const match of matches) {
    init[match.id] = match.predictedQualifiedTeamId ?? "";
  }
  return init;
}

function buildOfficialQualifierValues(matches: MatchRow[]) {
  const init: Record<string, string> = {};
  for (const match of matches) {
    init[match.id] = match.officialPredictedQualifiedTeamId ?? "";
  }
  return init;
}

function buildInitialBonusAnswers(questions: BonusQuestionRow[]) {
  const init: Record<string, string> = {};
  for (const question of questions) {
    init[question.id] = answerToString(question.answer);
  }
  return init;
}

function buildOfficialBonusAnswers(questions: BonusQuestionRow[]) {
  const init: Record<string, string> = {};
  for (const question of questions) {
    init[question.id] = answerToString(question.officialAnswer ?? question.answer);
  }
  return init;
}

function formatMatchdayLabel(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("es-ES", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function normalizeQuestionOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { value: item, label: item };
      }

      if (item && typeof item === "object") {
        const value = (item as { value?: unknown }).value;
        const label = (item as { label?: unknown }).label;

        if (typeof value === "string" && typeof label === "string") {
          return { value, label };
        }

        if (typeof value === "string") {
          return { value, label: value };
        }

        if (typeof label === "string") {
          return { value: label, label };
        }
      }

      return null;
    })
    .filter((item): item is QuestionOption => Boolean(item));
}

function answerToString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const nested = (value as { value?: unknown }).value;
    if (typeof nested === "string") {
      return nested;
    }
  }

  return "";
}

function formatFinalScoreTag(match: { isFinished: boolean; homeScore: number | null; awayScore: number | null } | null | undefined) {
  if (!match || !match.isFinished || match.homeScore === null || match.awayScore === null) {
    return "(-)";
  }

  return `(${match.homeScore}-${match.awayScore})`;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function UnifiedPredictionsBoard({
  matches,
  bonusQuestions,
  scoringSettings = DEFAULT_SCORING,
  readOnly = false,
  showQuestions = true,
  editPolicy,
  initialLastOfficialSubmittedAt = null,
}: {
  matches: MatchRow[];
  bonusQuestions: BonusQuestionRow[];
  scoringSettings?: ScoringSettings;
  readOnly?: boolean;
  showQuestions?: boolean;
  editPolicy?: PredictionEditPolicy;
  initialLastOfficialSubmittedAt?: string | null;
}) {
  const mainSections = showQuestions ? MAIN_SECTIONS : MAIN_SECTIONS_WITHOUT_QUESTIONS;
  const initialScoreValues = useMemo(() => buildInitialScoreValues(matches), [matches]);
  const initialOfficialScoreValues = useMemo(() => buildOfficialScoreValues(matches), [matches]);
  const initialQualifierValues = useMemo(() => buildInitialQualifierValues(matches), [matches]);
  const initialOfficialQualifierValues = useMemo(() => buildOfficialQualifierValues(matches), [matches]);
  const initialBonusValues = useMemo(() => buildInitialBonusAnswers(bonusQuestions), [bonusQuestions]);
  const initialOfficialBonusValues = useMemo(() => buildOfficialBonusAnswers(bonusQuestions), [bonusQuestions]);
  const [activeSection, setActiveSection] = useState<(typeof MAIN_SECTIONS)[number]["value"]>("GROUPS");
  const [activeGroup, setActiveGroup] = useState("");
  const [values, setValues] = useState<Record<string, { home: string; away: string }>>(() => initialScoreValues);
  const [qualifierValues, setQualifierValues] = useState<Record<string, string>>(() => initialQualifierValues);
  const [thirdOrder, setThirdOrder] = useState<string[]>([]);
  const [bonusAnswers, setBonusAnswers] = useState<Record<string, string>>(() => initialBonusValues);
  const [officialValues, setOfficialValues] = useState<Record<string, { home: string; away: string }>>(() => initialOfficialScoreValues);
  const [officialQualifierValues, setOfficialQualifierValues] = useState<Record<string, string>>(() => initialOfficialQualifierValues);
  const [officialBonusAnswers, setOfficialBonusAnswers] = useState<Record<string, string>>(() => initialOfficialBonusValues);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("DRAFT");
  const [lastOfficialSubmittedAt, setLastOfficialSubmittedAt] = useState<string | null>(initialLastOfficialSubmittedAt);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [officialConfirmOpen, setOfficialConfirmOpen] = useState(false);
  const [modalMatch, setModalMatch] = useState<PickableMatch | null>(null);
  const [modalScore, setModalScore] = useState({ home: "", away: "" });
  const [modalQualifiedTeamId, setModalQualifiedTeamId] = useState("");
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);

  const groupMatches = useMemo(() => matches.filter((match) => match.stage === "GROUP"), [matches]);
  const canEditGroupStage = !readOnly && (editPolicy?.canEditGroupStage ?? true);
  const canEditKnockoutStage = !readOnly && (editPolicy?.canEditKnockoutStage ?? true);

  const submissionWindowStatus = useMemo<SubmissionWindowStatus>(() => {
    if (editPolicy?.submissionWindowStatus) {
      return editPolicy.submissionWindowStatus;
    }

    if (readOnly) {
      return "LOCKED";
    }

    if (canEditGroupStage && canEditKnockoutStage) {
      return "OPEN";
    }

    if (!canEditGroupStage && canEditKnockoutStage) {
      return "REOPENED";
    }

    return "LOCKED";
  }, [readOnly, canEditGroupStage, canEditKnockoutStage]);

  const isLocked = submissionWindowStatus === "LOCKED";
  const isReopened = submissionWindowStatus === "REOPENED";

  const teamCodeByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const match of matches) {
      map.set(match.homeName, match.homeTeamCode);
      map.set(match.awayName, match.awayTeamCode);
    }
    return map;
  }, [matches]);

  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const match of groupMatches) {
      if (match.group) {
        groups.add(match.group);
      }
    }
    return Array.from(groups).sort((a, b) => a.localeCompare(b, "es"));
  }, [groupMatches]);

  useEffect(() => {
    if (!activeGroup && availableGroups.length > 0) {
      setActiveGroup(availableGroups[0]);
      return;
    }

    if (activeGroup && !availableGroups.includes(activeGroup) && availableGroups.length > 0) {
      setActiveGroup(availableGroups[0]);
    }
  }, [activeGroup, availableGroups]);

  const groupStandings = useMemo(() => {
    // fallbackToReal=false: las clasificaciones reflejan las predicciones del usuario, no los
    // resultados reales. Sin predicción para un partido, ese partido no cuenta en la tabla.
    return buildGroupStandings(matches, values, false);
  }, [matches, values]);

  const selectedGroupMatches = useMemo(() => {
    if (!activeGroup) {
      return [];
    }
    return groupMatches.filter((match) => match.group === activeGroup);
  }, [groupMatches, activeGroup]);

  const groupedByDate = useMemo(() => {
    if (!activeGroup) {
      return [];
    }

    const groups = new Map<string, { timestamp: number; matches: MatchRow[] }>();
    for (const match of selectedGroupMatches) {
      const label = formatMatchdayLabel(match.kickoffAt);
      const timestamp = new Date(match.kickoffAt).getTime();
      if (!groups.has(label)) {
        groups.set(label, { timestamp, matches: [] });
      }
      const entry = groups.get(label)!;
      entry.timestamp = Math.min(entry.timestamp, timestamp);
      entry.matches.push(match);
    }

    for (const [, dayEntry] of groups.entries()) {
      dayEntry.matches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .map(([label, entry]) => [label, entry.matches] as const);
  }, [selectedGroupMatches, activeGroup]);

  const defaultThirdRanking = useMemo(() => {
    return buildThirdPlaceRanking(matches, values);
  }, [matches, values]);

  useEffect(() => {
    if (defaultThirdRanking.length === 0) {
      setThirdOrder([]);
      return;
    }

    setThirdOrder((prev) => {
      const persistedOrder =
        prev.length === 0 && typeof window !== "undefined"
          ? (() => {
              try {
                const parsed = JSON.parse(window.localStorage.getItem(THIRDS_STORAGE_KEY) ?? "[]");
                return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
              } catch {
                return [];
              }
            })()
          : [];

      const sourceOrder = prev.length > 0 ? prev : persistedOrder;
      const validPrev = sourceOrder.filter((group) => defaultThirdRanking.some((row) => row.group === group));
      const missing = defaultThirdRanking.map((row) => row.group).filter((group) => !validPrev.includes(group));
      const next = [...validPrev, ...missing];

      if (next.length === prev.length && next.every((group, index) => group === prev[index])) {
        return prev;
      }

      return next;
    });
  }, [defaultThirdRanking]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(THIRDS_STORAGE_KEY, JSON.stringify(thirdOrder));
  }, [thirdOrder]);

  const thirdRanking = useMemo(() => {
    return buildThirdPlaceRanking(matches, values, thirdOrder, false);
  }, [matches, values, thirdOrder]);

  const bracket = useMemo(() => {
    // fallbackToReal=false: el bracket refleja las predicciones del usuario, no los resultados reales.
    return buildBracketTree(matches, values, thirdOrder, qualifierValues, false);
  }, [matches, values, thirdOrder, qualifierValues]);

  const matchIdByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const match of matches) {
      if (match.code) {
        map.set(match.code, match.id);
      }
    }
    return map;
  }, [matches]);

  const fillableKnockoutMatchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const round of bracket.rounds) {
      for (const slot of round.matches) {
        const matchId = matchIdByCode.get(slot.code);
        if (!matchId) {
          continue;
        }

        if (slot.home?.teamId && slot.away?.teamId) {
          ids.add(matchId);
        }
      }
    }
    return ids;
  }, [bracket.rounds, matchIdByCode]);

  const selectedKnockoutMatches = useMemo(() => {
    return matches.filter((match) => match.stage !== "GROUP");
  }, [matches]);

  const bracketMatches = useMemo(
    () =>
      matches.map((match) => ({
        id: match.id,
        stage: match.stage,
        group: match.group,
        code: match.code,
        kickoffAt: new Date(match.kickoffAt),
        stadium: match.stadium,
        city: match.city,
        homeName: match.homeName,
        homeFlag: match.homeFlag,
        homeTeamId: match.homeTeamId,
        awayName: match.awayName,
        awayFlag: match.awayFlag,
        awayTeamId: match.awayTeamId,
        isFinished: match.isFinished,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        predictedQualifiedTeamId: match.predictedQualifiedTeamId,
      })),
    [matches]
  );

  const matchesById = useMemo(() => {
    return new Map(matches.map((match) => [match.id, match]));
  }, [matches]);

  const pendingGroupCount = selectedGroupMatches.filter((match) => {
    const value = values[match.id];
    return !value || value.home === "" || value.away === "";
  }).length;

  const pendingKnockoutCount = selectedKnockoutMatches.filter((match) => {
    if (!fillableKnockoutMatchIds.has(match.id)) {
      return false;
    }

    const value = values[match.id];
    return !value || value.home === "" || value.away === "";
  }).length;

  const pendingQuestionCount = bonusQuestions.filter((question) => !bonusAnswers[question.id]).length;

  const editableMatches = useMemo(() => {
    return matches.filter((match) => {
      // Un partido con resultado oficial no se puede predecir ni editar.
      if (match.isFinished) {
        return false;
      }
      if (match.stage === "GROUP") {
        return canEditGroupStage;
      }
      return canEditKnockoutStage && fillableKnockoutMatchIds.has(match.id);
    });
  }, [matches, canEditGroupStage, canEditKnockoutStage, fillableKnockoutMatchIds]);

  const totalEditableResults = editableMatches.length;
  const pendingEditableResults = editableMatches.filter((match) => {
    const value = values[match.id];
    return !value || value.home === "" || value.away === "";
  }).length;
  const sentEditableResults = Math.max(0, totalEditableResults - pendingEditableResults);

  const pendingOfficialChangesCount = useMemo(() => {
    const matchIds = new Set([...Object.keys(values), ...Object.keys(officialValues), ...Object.keys(qualifierValues), ...Object.keys(officialQualifierValues)]);
    let changed = 0;

    for (const matchId of matchIds) {
      const match = matchesById.get(matchId);
      const currentScore = values[matchId] ?? { home: "", away: "" };
      const officialScore = officialValues[matchId] ?? { home: "", away: "" };
      const currentQualifier = normalizeQualifierForScore(match, currentScore, qualifierValues[matchId] ?? "");
      const officialQualifier = normalizeQualifierForScore(match, officialScore, officialQualifierValues[matchId] ?? "");

      if (
        currentScore.home !== officialScore.home ||
        currentScore.away !== officialScore.away ||
        currentQualifier !== officialQualifier
      ) {
        changed += 1;
      }
    }

    const questionIds = new Set([...Object.keys(bonusAnswers), ...Object.keys(officialBonusAnswers)]);
    for (const questionId of questionIds) {
      const currentAnswer = bonusAnswers[questionId] ?? "";
      const officialAnswer = officialBonusAnswers[questionId] ?? "";
      if (currentAnswer !== officialAnswer) {
        changed += 1;
      }
    }

    return changed;
  }, [values, officialValues, qualifierValues, officialQualifierValues, bonusAnswers, officialBonusAnswers, matchesById]);

  const potentialPenaltyPoints = isReopened ? pendingOfficialChangesCount * (editPolicy?.officialSubmissionPenaltyPerChange ?? 1) : 0;

  const hasPendingOfficialChanges = pendingOfficialChangesCount > 0;

  useEffect(() => {
    if (!lastOfficialSubmittedAt && !hasPendingOfficialChanges && submissionStatus !== "OFFICIAL") {
      setSubmissionStatus("OFFICIAL");
    }
  }, [hasPendingOfficialChanges, lastOfficialSubmittedAt, submissionStatus]);

  const persistPredictions = async () => {
    const payload = {
      mode: "official" as const,
      predictions: Object.entries(values)
        .filter(([, score]) => score.home !== "" && score.away !== "")
        .map(([matchId, score]) => {
          const match = matchesById.get(matchId);
          const normalizedQualifier = normalizeQualifierForScore(match, score, qualifierValues[matchId] ?? "");

          return {
            matchId,
            homeScore: Number(score.home),
            awayScore: Number(score.away),
            predictedQualifiedTeamId: normalizedQualifier || null,
          };
        }),
    };

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data: { error?: string } | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.error || "No se pudieron guardar predicciones");
    }
  };

  const persistBonusAnswers = async () => {
    const payload = {
      mode: "official" as const,
      answers: Object.entries(bonusAnswers)
        .filter(([, answer]) => answer !== "")
        .map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
    };

    const res = await fetch("/api/bonus-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data: { error?: string } | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.error || "No se pudieron guardar respuestas bonus");
    }
  };

  const persistSubmission = async () => {
    if (readOnly || isLocked) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (showQuestions) {
        await persistBonusAnswers();
        await persistPredictions();
      } else {
        await persistPredictions();
      }

      const nowIso = new Date().toISOString();

      setSubmissionStatus("OFFICIAL");
      setLastOfficialSubmittedAt(nowIso);
      const normalizedQualifiers = normalizeQualifierMap(matchesById, values, qualifierValues);
      setOfficialValues({ ...values });
      setQualifierValues(normalizedQualifiers);
      setOfficialQualifierValues(normalizedQualifiers);
      setOfficialBonusAnswers({ ...bonusAnswers });
      setMessage("✅ Predicción oficial enviada");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de red");
    } finally {
      setLoading(false);
    }
  };

  const fillRandomPredictions = () => {
    if (readOnly || isLocked || (!canEditGroupStage && !canEditKnockoutStage)) {
      return;
    }

    const confirmed = window.confirm(
      "Esto rellenara la porra de forma aleatoria y reemplazara tus valores actuales (no se enviara oficialmente). ¿Continuar?"
    );

    if (!confirmed) {
      return;
    }

    const nextScores: Record<string, { home: string; away: string }> = { ...values };
    const nextQualifiers: Record<string, string> = { ...qualifierValues };

    for (const match of matches) {
      const canEditThisMatch = match.stage === "GROUP" ? canEditGroupStage : canEditKnockoutStage;
      if (!canEditThisMatch) {
        continue;
      }

      const home = String(randomInt(0, 4));
      const away = String(randomInt(0, 4));
      nextScores[match.id] = { home, away };
    }

    const simulatedBracket = buildBracketTree(bracketMatches, nextScores, thirdOrder, nextQualifiers);
    const simulatedByCode = new Map(
      simulatedBracket.rounds.flatMap((round) => round.matches.map((slot) => [slot.code, slot] as const))
    );

    for (const match of matches) {
      const canEditThisMatch = match.stage === "GROUP" ? canEditGroupStage : canEditKnockoutStage;
      if (!canEditThisMatch || !isKnockoutStage(match.stage)) {
        continue;
      }

      const score = nextScores[match.id];
      if (!score || score.home === "" || score.away === "" || score.home !== score.away) {
        nextQualifiers[match.id] = "";
        continue;
      }

      const slot = match.code ? simulatedByCode.get(match.code) : undefined;
      const candidates = [slot?.home?.teamId, slot?.away?.teamId].filter((teamId): teamId is string => Boolean(teamId));
      nextQualifiers[match.id] = candidates.length > 0 ? candidates[randomInt(0, candidates.length - 1)] : "";
    }

    setValues(nextScores);
    setQualifierValues(nextQualifiers);

    if (showQuestions) {
      setBonusAnswers((prev) => {
        const next = { ...prev };
        for (const question of bonusQuestions) {
          const options = normalizeQuestionOptions(question.options);
          if (options.length === 0) {
            continue;
          }
          const pick = options[randomInt(0, options.length - 1)];
          next[question.id] = pick.value;
        }
        return next;
      });
    }

    setSubmissionStatus("DRAFT");
    setMessage("Porra rellenada aleatoriamente. Guarda borrador o envia oficialmente cuando quieras.");
  };

  const sendOfficial = async () => {
    if (readOnly || isLocked) {
      return;
    }

    if (isReopened && pendingOfficialChangesCount > 0) {
      setOfficialConfirmOpen(true);
      return;
    }

    await persistSubmission();
  };

  const resetAllUserResults = async () => {
    if (readOnly) {
      return;
    }

    const fullyUnlocked = submissionWindowStatus === "OPEN" && canEditGroupStage && canEditKnockoutStage;
    if (!fullyUnlocked) {
      return;
    }

    const confirmed = window.confirm("Se borrarán todos tus resultados y clasificados guardados. ¿Continuar?");
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/predictions/reset", {
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo resetear la porra");
      }

      const emptyScores = Object.fromEntries(matches.map((match) => [match.id, { home: "", away: "" }]));
      const emptyQualifiers = Object.fromEntries(matches.map((match) => [match.id, ""]));

      setValues(emptyScores);
      setQualifierValues(emptyQualifiers);
      setOfficialValues(emptyScores);
      setOfficialQualifierValues(emptyQualifiers);
      setSubmissionStatus("OFFICIAL");
      setLastOfficialSubmittedAt(new Date().toISOString());
      setMessage("✅ Todos tus resultados han sido reseteados");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de red");
    } finally {
      setLoading(false);
    }
  };

  const selectedGroupStandings = activeGroup ? groupStandings.get(activeGroup) ?? [] : [];

  const openResultModal = (match: PickableMatch) => {
    if (readOnly || isLocked) {
      return;
    }

    setModalMatch(match);
    setModalScore({
      home: values[match.id]?.home ?? "",
      away: values[match.id]?.away ?? "",
    });
    const selectedQualifier = qualifierValues[match.id] ?? "";
    const availableTeamIds = new Set([match.homeTeam?.teamId, match.awayTeam?.teamId].filter((teamId): teamId is string => Boolean(teamId)));
    setModalQualifiedTeamId(availableTeamIds.has(selectedQualifier) ? selectedQualifier : "");
  };

  const applyResultFromModal = () => {
    if (!modalMatch) {
      return;
    }

    const isDraw = modalScore.home !== "" && modalScore.away !== "" && modalScore.home === modalScore.away;
    const needsQualifier = isKnockoutStage(modalMatch.stage) && isDraw;

    setValues((prev) => ({
      ...prev,
      [modalMatch.id]: {
        home: modalScore.home,
        away: modalScore.away,
      },
    }));

    setQualifierValues((prev) => ({
      ...prev,
      [modalMatch.id]: needsQualifier ? modalQualifiedTeamId : "",
    }));

    setModalMatch(null);
  };

  const clearResultFromModal = () => {
    if (!modalMatch) {
      return;
    }

    setValues((prev) => ({
      ...prev,
      [modalMatch.id]: {
        home: "",
        away: "",
      },
    }));

    setQualifierValues((prev) => ({
      ...prev,
      [modalMatch.id]: "",
    }));

    setModalScore({ home: "", away: "" });
    setModalQualifiedTeamId("");
    setModalMatch(null);
  };

  const moveThird = (group: string, direction: -1 | 1) => {
    setThirdOrder((prev) => {
      const index = prev.indexOf(group);
      if (index === -1) {
        return prev;
      }

      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const resetThirdOrder = () => {
    if (readOnly) {
      return;
    }

    setThirdOrder(defaultThirdRanking.map((row) => row.group));
  };

  const handleDragEnd = () => {
    if (readOnly) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    if (!dragItem.current || !dragOverItem.current || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    setThirdOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(dragItem.current!);
      const toIdx = next.indexOf(dragOverItem.current!);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, dragItem.current!);
      return next;
    });
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const canSavePredictions =
    !readOnly && !isLocked && ((activeSection === "GROUPS" && canEditGroupStage) || (activeSection === "KNOCKOUT" && canEditKnockoutStage));
  const canSaveQuestions = !readOnly && !isLocked && showQuestions && activeSection === "QUESTIONS";

  const isThirdOrderManualOverride = useMemo(() => {
    const auto = defaultThirdRanking.map((row) => row.group);
    if (auto.length !== thirdOrder.length) {
      return false;
    }
    return auto.some((group, index) => group !== thirdOrder[index]);
  }, [defaultThirdRanking, thirdOrder]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-black/10 bg-neutral-100 p-1 dark:border-white/10 dark:bg-neutral-800">
        {mainSections.map((tab) => {
          const isActive = activeSection === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveSection(tab.value)}
              className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                isActive
                  ? "bg-emerald-700 text-white"
                  : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-black/10 bg-white/80 p-3 dark:border-white/10 dark:bg-neutral-900/70">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-bold dark:border-white/10 dark:bg-neutral-950">
            {submissionWindowStatus === "OPEN"
              ? "🟢 ABIERTA"
              : submissionWindowStatus === "REOPENED"
                ? "🟠 REABIERTA"
                : "🔴 CERRADA"}
          </span>
          {totalEditableResults > 0 && (
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                pendingEditableResults === 0
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              }`}
            >
              {pendingEditableResults === 0
                ? `✅ Todos enviados (${sentEditableResults}/${totalEditableResults})`
                : `⏳ Pendientes por enviar: ${pendingEditableResults}/${totalEditableResults}`}
            </span>
          )}
          {hasPendingOfficialChanges && !isLocked && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              ⚠️ Cambios pendientes de confirmar ({pendingOfficialChangesCount})
            </span>
          )}
          {isLocked && (
            <span className="rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              🔒 Predicciones cerradas
            </span>
          )}
        </div>

        {lastOfficialSubmittedAt && (
          <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-300">
            Último envío oficial: {new Date(lastOfficialSubmittedAt).toLocaleDateString("es-ES")} {new Date(lastOfficialSubmittedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        {isLocked && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-50/80 p-3 text-sm text-red-900 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-100">
            La porra está cerrada: no se pueden tocar resultados ni enviar cambios.
          </div>
        )}

        {activeSection === "GROUPS" && availableGroups.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {availableGroups.map((group) => (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`rounded px-2.5 py-1 text-xs font-bold ${
                    activeGroup === group
                      ? "bg-emerald-700 text-white"
                      : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
                  }`}
                >
                  Grupo {group}
                </button>
              ))}
            </div>
            {/* Scoring summary */}
            <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-50/70 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Sistema de puntuación · Fase de grupos</p>
              <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                <span>1X2 acertado: <span className="font-black">+3 pts</span></span>
                <span>Gol local exacto: <span className="font-black">+{scoringSettings.homeGoalsHit} pt</span></span>
                <span>Gol visitante exacto: <span className="font-black">+{scoringSettings.awayGoalsHit} pt</span></span>
                <span>Clasificado de grupo: <span className="font-black">+{scoringSettings.groupOrderHit} pts</span></span>
              </div>
            </div>
          </>
        )}

        {!readOnly && activeSection === "GROUPS" && !canEditGroupStage && (
          <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
            Los resultados solo se pueden cambiar antes del primer partido del Mundial.
          </div>
        )}

        {!readOnly && activeSection === "KNOCKOUT" && !canEditKnockoutStage && (
          <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
            Los cruces ya están cerrados. Solo se podían cambiar hasta el día antes del inicio de las eliminatorias.
          </div>
        )}

        {!readOnly && activeSection === "KNOCKOUT" && canEditKnockoutStage && editPolicy?.knockoutEditsHavePenalty && (
          <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
            Cambiar goles de cruces durante la fase de grupos aplica una penalización de -1 punto por cambio.
          </div>
        )}

        {activeSection === "GROUPS" && activeGroup && (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/70 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-100">Clasificación del Grupo {activeGroup}</h4>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                  {readOnly ? "Se recalcula automáticamente con los resultados oficiales." : "Se recalcula en vivo con los marcadores que vas metiendo."}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700 shadow-sm dark:bg-neutral-950 dark:text-emerald-300">
                Dinámico
              </span>
            </div>

            {selectedGroupStandings.length === 0 ? (
              <p className="text-sm text-emerald-900/70 dark:text-emerald-100/70">Todavía no hay resultados suficientes para ordenar este grupo.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/60 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-950/60">
                <div className="grid grid-cols-[1.4rem_1fr_3rem_3rem_3rem_3rem] gap-2 border-b border-black/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                  <span>Pos</span>
                  <span>Equipo</span>
                  <span className="text-right">Pts</span>
                  <span className="text-right">PJ</span>
                  <span className="text-right">DG</span>
                  <span className="text-right">GF</span>
                </div>
                <div className="divide-y divide-black/5 dark:divide-white/10">
                  {selectedGroupStandings.map((team, index) => (
                    <div key={`${team.group}-${team.name}`} className="grid grid-cols-[1.4rem_1fr_3rem_3rem_3rem_3rem] gap-2 px-3 py-2 text-sm">
                      <span className="font-black text-emerald-700 dark:text-emerald-300">{index + 1}</span>
                      <TeamLink teamId={teamCodeByName.get(team.name) ?? team.name} name={team.name} flag={team.flag} className="truncate" />
                      <span className="text-right font-black">{team.points}</span>
                      <span className="text-right text-neutral-600 dark:text-neutral-300">{team.played}</span>
                      <span className="text-right text-neutral-600 dark:text-neutral-300">{team.goalDifference}</span>
                      <span className="text-right text-neutral-600 dark:text-neutral-300">{team.goalsFor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === "THIRDS" ? (
          <div className="space-y-3">
            {/* Scoring summary */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-50/70 p-3 dark:border-violet-400/20 dark:bg-violet-500/10">
              <p className="text-xs font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">Sistema de puntuación · Mejores terceros</p>
              <p className="mt-1 text-xs text-violet-800/80 dark:text-violet-200/80">
                El orden de los mejores terceros determina contra quién se cruzan en 32avos. No suma puntos directamente, pero afecta tus pronósticos de eliminatoria. Acertar el clasificado de un partido de eliminatoria vale{" "}
                <span className="font-black">{scoringSettings.knockoutQualifierHit} pts</span>.
              </p>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-black">Orden de mejores terceros</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Arrastra para reordenar. Se calcula automático por resultados, pero puedes ajustarlo manualmente.
                </p>
              </div>
              <button
                onClick={resetThirdOrder}
                className="shrink-0 rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-bold hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                Restaurar automático
              </button>
            </div>

            {isThirdOrderManualOverride && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                Orden manual activo: no coincide con los desempates automáticos. Este orden se propaga en vivo a los cruces y cálculos.
              </div>
            )}

            {thirdRanking.length === 0 ? (
              <p className="text-sm text-neutral-500">Aún no hay terceros calculables. Mete algunos marcadores de grupos primero.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="rounded-full border border-emerald-400 bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:border-emerald-400/50 dark:bg-emerald-500/25 dark:text-emerald-100">
                    Puestos 1-8: Clasifican
                  </span>
                  <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-red-900 dark:border-red-400/50 dark:bg-red-500/25 dark:text-red-100">
                    Puestos 9-12: Eliminados
                  </span>
                </div>

                {thirdRanking.map((team, index) => {
                  const isTopEight = index < 8;

                  return (
                    <div key={`${team.group}-${team.name}`} className="space-y-2">
                      {index === 8 && (
                        <div className="rounded-lg border border-dashed border-red-400 bg-red-50 px-3 py-1 text-center text-[11px] font-black uppercase tracking-wide text-red-800 dark:border-red-400/60 dark:bg-red-500/15 dark:text-red-200">
                          Corte de clasificación
                        </div>
                      )}

                      <div
                        draggable={!readOnly}
                        onDragStart={() => {
                          if (!readOnly) {
                            dragItem.current = team.group;
                          }
                        }}
                        onDragEnter={() => {
                          if (!readOnly) {
                            dragOverItem.current = team.group;
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={handleDragEnd}
                        className={`grid grid-cols-[1.5rem_2.2rem_1fr_auto] items-center gap-2 rounded-xl border-2 px-3 py-2 ${
                          isTopEight
                            ? "border-emerald-500 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-500/20"
                            : "border-red-400 bg-red-100 dark:border-red-400/70 dark:bg-red-500/20"
                        } ${readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing active:opacity-60"}`}
                      >
                        <span
                          className={`select-none text-center text-base leading-none ${
                            isTopEight ? "text-emerald-700 dark:text-emerald-200" : "text-red-700 dark:text-red-200"
                          }`}
                          aria-hidden
                        >
                          ⠿
                        </span>

                        <span
                          className={`text-sm font-black ${
                            isTopEight ? "text-emerald-900 dark:text-emerald-100" : "text-red-900 dark:text-red-100"
                          }`}
                        >
                          {index + 1}
                        </span>

                        <div className="min-w-0 text-sm">
                          <p className="truncate font-bold">
                            <TeamLink teamId={teamCodeByName.get(team.name) ?? team.name} name={team.name} flag={team.flag} className="font-bold" />{" "}
                            <span className={isTopEight ? "text-emerald-900/80 dark:text-emerald-100/80" : "text-red-900/80 dark:text-red-100/80"}>
                              (Grupo {team.group})
                            </span>
                          </p>
                          <p className={`text-xs ${isTopEight ? "text-emerald-900/80 dark:text-emerald-100/80" : "text-red-900/80 dark:text-red-100/80"}`}>
                            Pts {team.points} · DG {team.goalDifference} · GF {team.goalsFor}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                            isTopEight ? "bg-emerald-700 text-white" : "bg-red-700 text-white"
                          }`}
                        >
                          {isTopEight ? "Clasifica" : "Fuera"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : showQuestions && activeSection === "QUESTIONS" ? (
          <div className="space-y-3">
            {/* Scoring summary */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-50/70 p-3 dark:border-amber-400/20 dark:bg-amber-500/10">
              <p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Sistema de puntuación · Preguntas bonus</p>
              <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                Cada pregunta bonus acertada vale{" "}
                <span className="font-black">{scoringSettings.bonusQuestionDefault} pts</span>{" "}
                (o los puntos indicados en la propia pregunta si se especifica otro valor).
              </p>
            </div>
            {bonusQuestions.length === 0 ? (
              <p className="text-sm text-neutral-500">Todavía no hay preguntas cargadas.</p>
            ) : (
              bonusQuestions.map((question) => {
                const options = normalizeQuestionOptions(question.options);
                const deadline = new Date(question.deadline);
                return (
                  <div key={question.id} className="rounded-xl border border-black/10 bg-neutral-50 p-3 dark:border-white/10 dark:bg-neutral-800/50">
                    <p className="text-sm font-black">{question.question}</p>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                      Cierre: {deadline.toLocaleDateString("es-ES")} {deadline.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <select
                      className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-900"
                      value={bonusAnswers[question.id] ?? ""}
                      disabled={readOnly}
                      onChange={(e) =>
                        setBonusAnswers((prev) => ({
                          ...prev,
                          [question.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Seleccionar...</option>
                      {options.map((option) => (
                        <option key={`${question.id}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })
            )}
          </div>
        ) : activeSection === "KNOCKOUT" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-50/70 p-3 dark:border-blue-400/20 dark:bg-blue-500/10">
              <p className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">Sistema de puntuación · Fase eliminatoria</p>
              <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-blue-800/80 dark:text-blue-200/80">
                <span>Gol local exacto: <span className="font-black">+{scoringSettings.homeGoalsHit} pt</span></span>
                <span>Gol visitante exacto: <span className="font-black">+{scoringSettings.awayGoalsHit} pt</span></span>
                <span>Clasificado acertado: <span className="font-black">+{scoringSettings.knockoutQualifierHit} pts</span></span>
              </div>
            </div>

            <BracketBoard
              matches={bracketMatches}
              liveScores={values}
              liveQualifiers={qualifierValues}
              thirdOrderOverride={thirdOrder}
              onLiveScoresChange={setValues}
              onLiveQualifiersChange={setQualifierValues}
              scoringSettings={scoringSettings}
            />
          </div>
        ) : selectedGroupMatches.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center">
            <p className="text-sm text-neutral-500">No hay partidos para este grupo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDate.map(([dayLabel, dayMatches]) => (
              <div key={dayLabel}>
                <h4 className="mb-2 text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">
                  {dayLabel}
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {dayMatches.map((match) => {
                    const hScore = values[match.id]?.home;
                    const aScore = values[match.id]?.away;
                    const hasPrediction = hScore !== "" && aScore !== "";

                    return (
                      <div
                        key={match.id}
                        className={`group relative rounded-2xl border bg-neutral-50 p-4 text-left transition-shadow dark:bg-neutral-800/50 ${
                          !readOnly && hasPrediction && !match.isFinished
                            ? "border-emerald-400 dark:border-emerald-500/40"
                            : "border-black/5 dark:border-white/10"
                        }`}
                      >
                        {!readOnly && hasPrediction && !match.isFinished && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">✓</span>
                        )}

                        <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          {new Date(match.kickoffAt).toLocaleDateString("es-ES", { month: "short", day: "numeric" }).toUpperCase()}
                          {" · "}
                          {new Date(match.kickoffAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="mb-3 text-center text-[10px] text-neutral-500 dark:text-neutral-400">
                          {match.stadium || "Sede por confirmar"}
                          {match.city ? `, ${match.city}` : ""}
                        </p>

                        <div className="flex items-center justify-center gap-2">
                          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
                            <TeamLink teamId={match.homeTeamCode} name={match.homeName} flag={match.homeFlag} className="text-xs font-bold leading-tight" />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              !readOnly &&
                              !isLocked &&
                              !match.isFinished &&
                              canEditGroupStage &&
                              openResultModal({
                                id: match.id,
                                stage: match.stage,
                                kickoffAt: match.kickoffAt,
                                stadium: match.stadium,
                                city: match.city,
                                homeTeam: {
                                  name: match.homeName,
                                  flag: match.homeFlag,
                                  group: match.group ?? "",
                                  teamId: match.homeTeamId,
                                },
                                awayTeam: {
                                  name: match.awayName,
                                  flag: match.awayFlag,
                                  group: match.group ?? "",
                                  teamId: match.awayTeamId,
                                },
                              })
                            }
                            disabled={readOnly || isLocked || match.isFinished || !canEditGroupStage}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-emerald-50 disabled:cursor-default dark:hover:bg-emerald-900/20"
                          >
                            <div className="flex flex-col items-center gap-0.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-200/80 text-sm font-black dark:bg-neutral-700">
                                  {hScore || ""}
                              </div>
                            </div>
                            <span className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-black tracking-wide text-white">VS</span>
                            <div className="flex flex-col items-center gap-0.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-200/80 text-sm font-black dark:bg-neutral-700">
                                  {aScore || ""}
                              </div>
                            </div>
                          </button>

                          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
                            <TeamLink teamId={match.awayTeamCode} name={match.awayName} flag={match.awayFlag} className="text-xs font-bold leading-tight" />
                          </div>
                        </div>

                        {match.isFinished && (
                          <p className="mt-2 text-center text-[10px] text-neutral-500 dark:text-neutral-400">
                            Real {formatFinalScoreTag(match)}
                          </p>
                        )}

                        {!readOnly && match.isFinished && hasPrediction && (
                          <div className="mt-3 rounded-lg bg-neutral-200/40 px-2 py-1.5 text-center dark:bg-neutral-700/40">
                            {(() => {
                              const { points, breakdown } = calculateMatchPoints(
                                { home: Number(hScore!), away: Number(aScore!) },
                                { home: match.homeScore, away: match.awayScore },
                                scoringSettings
                              );
                              return (
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                  {points > 0 ? `+${points} pts ` : "0 pts "}
                                  <span className="text-[10px] font-normal text-neutral-600 dark:text-neutral-400">
                                    {breakdown}
                                  </span>
                                </p>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {(activeSection === "GROUPS" ? pendingGroupCount : activeSection === "KNOCKOUT" ? pendingKnockoutCount : pendingQuestionCount) > 0 && (
                <span>
                  {activeSection === "GROUPS"
                    ? `${pendingGroupCount} sin completar`
                    : activeSection === "KNOCKOUT"
                      ? `${pendingKnockoutCount} sin completar`
                      : `${pendingQuestionCount} preguntas sin responder`}
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={resetAllUserResults}
                disabled={
                  loading ||
                  readOnly ||
                  submissionWindowStatus !== "OPEN" ||
                  !canEditGroupStage ||
                  !canEditKnockoutStage
                }
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                Reset total resultados
              </button>
              <button
                onClick={fillRandomPredictions}
                disabled={loading || submissionWindowStatus !== "OPEN" || (!canEditGroupStage && !canEditKnockoutStage)}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
              >
                Rellenar aleatorio
              </button>
              <button
                onClick={sendOfficial}
                disabled={loading || isLocked || (!canEditGroupStage && !canEditKnockoutStage)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Enviar / Guardar"}
              </button>
            </div>
          </div>

          {!isLocked && isReopened && hasPendingOfficialChanges && (
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Al enviar oficialmente en modo reabierto se aplicará una penalización estimada de -{potentialPenaltyPoints} puntos.
            </p>
          )}

          {!isLocked && !isReopened && (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              En modo abierto puedes reenviar oficialmente sin penalización.
            </p>
          )}
        </div>
      )}

      {!readOnly && modalMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900">
            <h3 className="text-base font-black">Selecciona resultado</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {modalMatch.homeTeam?.name ?? "Por definir"} vs {modalMatch.awayTeam?.name ?? "Por definir"}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {new Date(modalMatch.kickoffAt).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
              {" · "}
              {new Date(modalMatch.kickoffAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              {" · "}
              {modalMatch.stadium || "Sede por confirmar"}
              {modalMatch.city ? `, ${modalMatch.city}` : ""}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {modalMatch.homeTeam?.name ?? "Por definir"}
                <select
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  value={modalScore.home}
                  onChange={(e) => setModalScore((prev) => ({ ...prev, home: e.target.value }))}
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
                {modalMatch.awayTeam?.name ?? "Por definir"}
                <select
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  value={modalScore.away}
                  onChange={(e) => setModalScore((prev) => ({ ...prev, away: e.target.value }))}
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

            {isKnockoutStage(modalMatch.stage) && modalScore.home !== "" && modalScore.away !== "" && modalScore.home === modalScore.away && (
              <label className="mt-3 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Si hay empate, ¿quien clasifica?
                <select
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-neutral-950"
                  value={modalQualifiedTeamId}
                  onChange={(e) => setModalQualifiedTeamId(e.target.value)}
                >
                  <option value="">Sin seleccionar</option>
                  {modalMatch.homeTeam?.teamId && (
                    <option value={modalMatch.homeTeam.teamId}>{modalMatch.homeTeam.name}</option>
                  )}
                  {modalMatch.awayTeam?.teamId && (
                    <option value={modalMatch.awayTeam.teamId}>{modalMatch.awayTeam.name}</option>
                  )}
                </select>
              </label>
            )}

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
                  onClick={() => setModalScore(score)}
                  className="rounded border border-black/10 px-2 py-1 text-xs font-bold hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-neutral-800"
                >
                  {score.home}-{score.away}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={clearResultFromModal}
                className="mr-auto rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                Borrar resultado
              </button>
              <button
                onClick={() => setModalMatch(null)}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-bold dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={applyResultFromModal}
                disabled={
                  modalScore.home === "" ||
                  modalScore.away === "" ||
                  (isKnockoutStage(modalMatch.stage) &&
                    modalScore.home === modalScore.away &&
                    !modalQualifiedTeamId)
                }
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {!readOnly && officialConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-neutral-900">
            <h3 className="text-base font-black">Confirmar envío oficial</h3>
            <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
              Has realizado {pendingOfficialChangesCount} cambios.
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
              Al enviar oficialmente perderas {potentialPenaltyPoints} puntos.
            </p>
            <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-200">
              ¿Deseas continuar?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setOfficialConfirmOpen(false)}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-bold dark:border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setOfficialConfirmOpen(false);
                  await persistSubmission();
                }}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-800"
              >
                Enviar oficialmente
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-xs font-semibold ${message.includes("✓") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
