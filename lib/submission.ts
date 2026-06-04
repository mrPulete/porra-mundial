import { MatchStage, type PenaltyTarget } from "@prisma/client";
import { z } from "zod";

export const submissionModeSchema = z.enum(["draft", "official"]);

export const predictionPayloadSchema = z.object({
  mode: submissionModeSchema,
  predictions: z.array(
    z.object({
      matchId: z.string().min(1),
      homeScore: z.number().int().min(0).max(99),
      awayScore: z.number().int().min(0).max(99),
      predictedQualifiedTeamId: z.string().min(1).nullable().optional(),
    })
  ),
});

export const bonusPayloadSchema = z.object({
  mode: submissionModeSchema,
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answer: z.string().min(1),
    })
  ),
});

export type SubmissionMode = z.infer<typeof submissionModeSchema>;
export type PredictionInput = z.infer<typeof predictionPayloadSchema>["predictions"][number];
export type BonusInput = z.infer<typeof bonusPayloadSchema>["answers"][number];

export type DraftMatchEntry = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  predictedQualifiedTeamId: string | null;
};

export type DraftBonusEntry = {
  questionId: string;
  answer: string;
};

export function outcomeFromScore(home: number, away: number): "1" | "X" | "2" {
  if (home > away) {
    return "1";
  }
  if (home < away) {
    return "2";
  }
  return "X";
}

export function penaltyTargetForStage(stage: MatchStage): PenaltyTarget {
  if (stage === MatchStage.GROUP) {
    return "MATCH_EDIT";
  }
  if (stage === MatchStage.FINAL) {
    return "CHAMPION_EDIT";
  }
  return "KNOCKOUT_EDIT";
}

export function parseDraftMatchEntries(raw: unknown): DraftMatchEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: DraftMatchEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const entry = item as {
      matchId?: unknown;
      homeScore?: unknown;
      awayScore?: unknown;
      predictedQualifiedTeamId?: unknown;
    };

    if (
      typeof entry.matchId === "string" &&
      typeof entry.homeScore === "number" &&
      Number.isFinite(entry.homeScore) &&
      typeof entry.awayScore === "number" &&
      Number.isFinite(entry.awayScore)
    ) {
      parsed.push({
        matchId: entry.matchId,
        homeScore: Math.trunc(entry.homeScore),
        awayScore: Math.trunc(entry.awayScore),
        predictedQualifiedTeamId: typeof entry.predictedQualifiedTeamId === "string" ? entry.predictedQualifiedTeamId : null,
      });
    }
  }

  return parsed;
}

export function parseDraftBonusEntries(raw: unknown): DraftBonusEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: DraftBonusEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const entry = item as {
      questionId?: unknown;
      answer?: unknown;
    };

    if (typeof entry.questionId === "string" && typeof entry.answer === "string") {
      parsed.push({
        questionId: entry.questionId,
        answer: entry.answer,
      });
    }
  }

  return parsed;
}

export function sameMatchPrediction(
  current: { home: number; away: number; qualifiedTeamId: string | null },
  next: { home: number; away: number; qualifiedTeamId: string | null }
) {
  return current.home === next.home && current.away === next.away && current.qualifiedTeamId === next.qualifiedTeamId;
}

export function sameBonusAnswer(current: string, next: string) {
  return current === next;
}

// Las respuestas/soluciones de bonus se guardan como Json: o bien un string directo,
// o un objeto { value: string }. Normaliza ambos casos a un string comparable ("" si no aplica).
export function normalizeBonusAnswerValue(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (raw && typeof raw === "object" && typeof (raw as { value?: unknown }).value === "string") {
    return (raw as { value: string }).value;
  }
  return "";
}
