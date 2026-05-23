import { MatchStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const defaultOneXTwoByStage: Record<MatchStage, number> = {
  GROUP: 1,
  ROUND_OF_32: 2,
  ROUND_OF_16: 3,
  QUARTER_FINAL: 4,
  SEMI_FINAL: 5,
  THIRD_PLACE: 4,
  FINAL: 6,
};

export async function ensureStageScoring() {
  for (const stage of Object.keys(defaultOneXTwoByStage) as MatchStage[]) {
    await prisma.stageScoring.upsert({
      where: { stage },
      update: {},
      create: {
        stage,
        oneXTwo: defaultOneXTwoByStage[stage],
      },
    });
  }
}

export async function getStageScoringMap() {
  await ensureStageScoring();

  const rules = await prisma.stageScoring.findMany();
  const map = new Map<MatchStage, number>();

  for (const rule of rules) {
    map.set(rule.stage, rule.oneXTwo);
  }

  return map;
}
