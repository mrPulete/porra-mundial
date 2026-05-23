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
  const [firstMatch, firstKnockoutMatch] = await Promise.all([
    prisma.match.findFirst({
      orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
      select: { kickoffAt: true },
    }),
    prisma.match.findFirst({
      where: { stage: { not: MatchStage.GROUP } },
      orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
      select: { kickoffAt: true },
    }),
  ]);

  const firstWorldCupKickoffAt = firstMatch?.kickoffAt ?? null;
  const firstKnockoutKickoffAt = firstKnockoutMatch?.kickoffAt ?? null;
  const knockoutCutoffAt = firstKnockoutKickoffAt
    ? new Date(firstKnockoutKickoffAt.getTime() - 24 * 60 * 60 * 1000)
    : null;

  const beforeWorldCupStart = !firstWorldCupKickoffAt || now < firstWorldCupKickoffAt;
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