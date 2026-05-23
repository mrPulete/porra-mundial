import { promises as fs } from "node:fs";
import path from "node:path";

export type ScoringSettings = {
  homeGoalsHit: number;
  awayGoalsHit: number;
  groupOrderHit: number;
  knockoutQualifierHit: number;
  bonusQuestionDefault: number;
  miscExtra: number;
};

export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  homeGoalsHit: 1,
  awayGoalsHit: 1,
  groupOrderHit: 6,
  knockoutQualifierHit: 8,
  bonusQuestionDefault: 3,
  miscExtra: 1,
};

function sanitizeValue(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function sanitizeSettings(raw: Partial<ScoringSettings> | null | undefined): ScoringSettings {
  return {
    homeGoalsHit: sanitizeValue(raw?.homeGoalsHit, DEFAULT_SCORING_SETTINGS.homeGoalsHit),
    awayGoalsHit: sanitizeValue(raw?.awayGoalsHit, DEFAULT_SCORING_SETTINGS.awayGoalsHit),
    groupOrderHit: sanitizeValue(raw?.groupOrderHit, DEFAULT_SCORING_SETTINGS.groupOrderHit),
    knockoutQualifierHit: sanitizeValue(raw?.knockoutQualifierHit, DEFAULT_SCORING_SETTINGS.knockoutQualifierHit),
    bonusQuestionDefault: sanitizeValue(raw?.bonusQuestionDefault, DEFAULT_SCORING_SETTINGS.bonusQuestionDefault),
    miscExtra: sanitizeValue(raw?.miscExtra, DEFAULT_SCORING_SETTINGS.miscExtra),
  };
}

const SETTINGS_FILE = path.join(process.cwd(), "data", "scoring-settings.json");

export async function getScoringSettings(): Promise<ScoringSettings> {
  try {
    const file = await fs.readFile(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(file) as Partial<ScoringSettings>;
    return sanitizeSettings(parsed);
  } catch {
    return DEFAULT_SCORING_SETTINGS;
  }
}

export async function saveScoringSettings(raw: Partial<ScoringSettings>) {
  const settings = sanitizeSettings(raw);
  await fs.writeFile(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return settings;
}
