import { MatchStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function isKnockoutStage(stage: MatchStage) {
  return stage !== MatchStage.GROUP;
}

export type PredictionEditPolicy = {
  firstWorldCupKickoffAt: string | null;
  knockoutCutoffAt: string | null;
  canEditGroupStage: boolean;
  canEditKnockoutStage: boolean;
  knockoutEditsHavePenalty: boolean;
  submissionWindowStatus: "OPEN" | "LOCKED" | "REOPENED";
  officialSubmissionPenaltyPerChange: number;
};

export async function getPredictionEditPolicy(now = new Date()): Promise<PredictionEditPolicy> {
  // Usamos lockAt (no kickoffAt) como frontera: es el campo que el admin actualiza con lock-round.
  // Por defecto lockAt = kickoffAt - 30 min; cuando el admin bloquea manualmente, lockAt queda
  // en el pasado de forma inmediata.
  const [firstMatch, firstKnockoutMatch] = await Promise.all([
    prisma.match.findFirst({
      orderBy: [{ lockAt: "asc" }, { roundOrder: "asc" }],
      select: { kickoffAt: true, lockAt: true },
    }),
    prisma.match.findFirst({
      where: { stage: { not: MatchStage.GROUP } },
      orderBy: [{ lockAt: "asc" }, { roundOrder: "asc" }],
      select: { kickoffAt: true, lockAt: true },
    }),
  ]);

  const firstWorldCupKickoffAt = firstMatch?.kickoffAt ?? null;
  // La ventana de predicciones se cierra en el primer lockAt, no en el kickoff.
  const firstWorldCupLockAt = firstMatch?.lockAt ?? null;
  // El corte para KO es el primer lockAt de partido de eliminatoria.
  const knockoutCutoffAt = firstKnockoutMatch?.lockAt ?? null;

  const beforeWorldCupStart = !firstWorldCupLockAt || now < firstWorldCupLockAt;
  const beforeKnockoutCutoff = Boolean(knockoutCutoffAt && now < knockoutCutoffAt);
  const submissionWindowStatus = beforeWorldCupStart
    ? "OPEN"
    : beforeKnockoutCutoff
      ? "REOPENED"
      : "LOCKED";

  return {
    firstWorldCupKickoffAt: firstWorldCupKickoffAt?.toISOString() ?? null,
    knockoutCutoffAt: knockoutCutoffAt?.toISOString() ?? null,
    canEditGroupStage: beforeWorldCupStart,
    canEditKnockoutStage: beforeWorldCupStart || beforeKnockoutCutoff,
    knockoutEditsHavePenalty: !beforeWorldCupStart && beforeKnockoutCutoff,
    submissionWindowStatus,
    officialSubmissionPenaltyPerChange: 1,
  };
}

export function canEditMatchPrediction(stage: MatchStage, policy: PredictionEditPolicy) {
  return isKnockoutStage(stage) ? policy.canEditKnockoutStage : policy.canEditGroupStage;
}