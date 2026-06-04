import type { MatchStage, PenaltyTarget, ScoringRuleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RuleSeed = {
  stage: MatchStage;
  ruleType: ScoringRuleType;
  points: number;
  enabled?: boolean;
};

type BonusRuleSeed = {
  code: string;
  label: string;
  points: number;
  sortOrder: number;
  enabled?: boolean;
};

type PenaltySeed = {
  target: PenaltyTarget;
  points: number;
  enabled?: boolean;
};

const DEFAULT_SCORING_RULES: RuleSeed[] = [
  { stage: "GROUP" as MatchStage, ruleType: "EXACT_SCORE" as ScoringRuleType, points: 5 },
  { stage: "GROUP" as MatchStage, ruleType: "OUTCOME_1X2" as ScoringRuleType, points: 3 },
  { stage: "GROUP" as MatchStage, ruleType: "SINGLE_TEAM_GOALS" as ScoringRuleType, points: 1 },

  { stage: "ROUND_OF_32" as MatchStage, ruleType: "EXACT_SCORE" as ScoringRuleType, points: 6 },
  { stage: "ROUND_OF_32" as MatchStage, ruleType: "QUALIFIED_TEAM" as ScoringRuleType, points: 2 },

  { stage: "ROUND_OF_16" as MatchStage, ruleType: "EXACT_SCORE" as ScoringRuleType, points: 6 },
  { stage: "ROUND_OF_16" as MatchStage, ruleType: "QUALIFIED_TEAM" as ScoringRuleType, points: 3 },

  { stage: "QUARTER_FINAL" as MatchStage, ruleType: "EXACT_SCORE" as ScoringRuleType, points: 7 },
  { stage: "QUARTER_FINAL" as MatchStage, ruleType: "QUALIFIED_TEAM" as ScoringRuleType, points: 4 },

  { stage: "SEMI_FINAL" as MatchStage, ruleType: "EXACT_SCORE" as ScoringRuleType, points: 8 },
  { stage: "SEMI_FINAL" as MatchStage, ruleType: "QUALIFIED_TEAM" as ScoringRuleType, points: 5 },

  { stage: "FINAL" as MatchStage, ruleType: "EXACT_SCORE" as ScoringRuleType, points: 10 },
  { stage: "FINAL" as MatchStage, ruleType: "QUALIFIED_TEAM" as ScoringRuleType, points: 8 },

  { stage: "FINAL" as MatchStage, ruleType: "CHAMPION_PREDICTION" as ScoringRuleType, points: 15 },
];

const DEFAULT_BONUS_RULES: BonusRuleSeed[] = [
  { code: "CHAMPION", label: "Champion", points: 15, sortOrder: 10 },
  { code: "RUNNER_UP", label: "Runner-up", points: 8, sortOrder: 20 },
  { code: "TOP_SCORER", label: "Top scorer", points: 10, sortOrder: 30 },
  { code: "BEST_PLAYER", label: "Best player", points: 8, sortOrder: 40 },
  { code: "BEST_GOALKEEPER", label: "Best goalkeeper", points: 6, sortOrder: 50 },
  { code: "BEST_YOUNG_PLAYER", label: "Best young player", points: 6, sortOrder: 60 },
  { code: "FAIR_PLAY", label: "Fair Play", points: 5, sortOrder: 70 },
  { code: "MOST_FUN_TEAM", label: "Most fun team", points: 3, sortOrder: 80 },
];

const DEFAULT_PENALTIES: PenaltySeed[] = [
  { target: "MATCH_EDIT" as PenaltyTarget, points: -1, enabled: true },
  { target: "KNOCKOUT_EDIT" as PenaltyTarget, points: -1, enabled: true },
  { target: "CHAMPION_EDIT" as PenaltyTarget, points: -5, enabled: true },
];

export async function ensureLeagueScoringConfig(leagueId: string) {
  for (const rule of DEFAULT_SCORING_RULES) {
    await prisma.scoringRule.upsert({
      where: {
        leagueId_stage_ruleType: {
          leagueId,
          stage: rule.stage,
          ruleType: rule.ruleType,
        },
      },
      update: {},
      create: {
        leagueId,
        stage: rule.stage,
        ruleType: rule.ruleType,
        points: rule.points,
        enabled: rule.enabled ?? true,
      },
    });
  }

  for (const rule of DEFAULT_BONUS_RULES) {
    await prisma.bonusRule.upsert({
      where: {
        leagueId_code: {
          leagueId,
          code: rule.code,
        },
      },
      update: {},
      create: {
        leagueId,
        code: rule.code,
        label: rule.label,
        points: rule.points,
        sortOrder: rule.sortOrder,
        enabled: rule.enabled ?? true,
      },
    });
  }

  for (const penalty of DEFAULT_PENALTIES) {
    await prisma.penaltyRule.upsert({
      where: {
        leagueId_target: {
          leagueId,
          target: penalty.target,
        },
      },
      update: {},
      create: {
        leagueId,
        target: penalty.target,
        points: penalty.points,
        enabled: penalty.enabled ?? true,
      },
    });
  }
}

export async function getLeagueScoringConfig(leagueId: string) {
  await ensureLeagueScoringConfig(leagueId);

  const [rules, bonusRules, penaltyRules] = await Promise.all([
    prisma.scoringRule.findMany({ where: { leagueId }, orderBy: [{ stage: "asc" }, { ruleType: "asc" }] }),
    prisma.bonusRule.findMany({ where: { leagueId }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.penaltyRule.findMany({ where: { leagueId }, orderBy: { target: "asc" } }),
  ]);

  return { rules, bonusRules, penaltyRules };
}

export function resolveRulePoints(
  rules: Array<{ stage: MatchStage; ruleType: ScoringRuleType; points: number; enabled: boolean }>,
  stage: MatchStage,
  ruleType: ScoringRuleType
) {
  const direct = rules.find((rule) => rule.enabled && rule.stage === stage && rule.ruleType === ruleType);
  return direct?.points ?? 0;
}

export function resolvePenaltyPoints(
  penalties: Array<{ target: PenaltyTarget; points: number; enabled: boolean }>,
  target: PenaltyTarget
) {
  const rule = penalties.find((item) => item.target === target);
  if (!rule || !rule.enabled) {
    return 0;
  }
  return rule.points;
}

export function resolveBonusPoints(
  bonusRules: Array<{ code: string; points: number; enabled: boolean }>,
  code: string | null | undefined
) {
  if (!code) {
    return 0;
  }
  const rule = bonusRules.find((item) => item.enabled && item.code === code);
  return rule?.points ?? 0;
}
