import { prisma } from "@/lib/prisma";

type QuestionOption = {
  value: string;
  label: string;
};

type BonusQuestionSeed = {
  code: string;
  question: string;
  points: number;
  optionsSource: "teams" | "players";
};

const PLAYER_SHORTLIST: QuestionOption[] = [
  { value: "mbappe", label: "Kylian Mbappe" },
  { value: "vinicius", label: "Vinicius Jr." },
  { value: "bellingham", label: "Jude Bellingham" },
  { value: "haaland", label: "Erling Haaland" },
  { value: "kane", label: "Harry Kane" },
  { value: "musiala", label: "Jamal Musiala" },
  { value: "wirtz", label: "Florian Wirtz" },
  { value: "foden", label: "Phil Foden" },
  { value: "yamal", label: "Lamine Yamal" },
  { value: "pedri", label: "Pedri" },
  { value: "valverde", label: "Federico Valverde" },
  { value: "lautaro", label: "Lautaro Martinez" },
  { value: "julian_alvarez", label: "Julian Alvarez" },
  { value: "rodrygo", label: "Rodrygo" },
  { value: "saka", label: "Bukayo Saka" },
  { value: "palmer", label: "Cole Palmer" },
  { value: "gakpo", label: "Cody Gakpo" },
  { value: "dembele", label: "Ousmane Dembele" },
  { value: "kvaratskhelia", label: "Khvicha Kvaratskhelia" },
  { value: "other", label: "Otro" },
];

const FIFA_BONUS_QUESTIONS: BonusQuestionSeed[] = [
  {
    code: "CHAMPION",
    question: "Que seleccion sera campeona del Mundial 2026?",
    points: 15,
    optionsSource: "teams",
  },
  {
    code: "RUNNER_UP",
    question: "Que seleccion sera subcampeona del Mundial 2026?",
    points: 8,
    optionsSource: "teams",
  },
  {
    code: "TOP_SCORER",
    question: "Quien ganara la Bota de Oro (maximo goleador)?",
    points: 10,
    optionsSource: "players",
  },
  {
    code: "BEST_PLAYER",
    question: "Quien ganara el Balon de Oro del Mundial (mejor jugador)?",
    points: 8,
    optionsSource: "players",
  },
  {
    code: "BEST_GOALKEEPER",
    question: "Quien ganara el Guante de Oro (mejor portero)?",
    points: 6,
    optionsSource: "players",
  },
  {
    code: "BEST_YOUNG_PLAYER",
    question: "Quien ganara el premio al Mejor Jugador Joven?",
    points: 6,
    optionsSource: "players",
  },
  {
    code: "FAIR_PLAY",
    question: "Que seleccion ganara el premio Fair Play FIFA?",
    points: 5,
    optionsSource: "teams",
  },
];

function buildTeamOptions(
  teams: Array<{
    code: string;
    name: string;
    flagEmoji: string;
  }>
): QuestionOption[] {
  return teams.map((team) => ({
    value: team.code,
    label: `${team.flagEmoji} ${team.name}`,
  }));
}

function computeDefaultDeadline(firstKickoffAt: Date | null): Date {
  if (!firstKickoffAt) {
    return new Date("2026-06-10T18:00:00.000Z");
  }

  return new Date(firstKickoffAt.getTime() - 60 * 60 * 1000);
}

export async function ensureDefaultFifaBonusQuestions() {
  const existing = await prisma.bonusQuestion.findMany({
    where: {
      code: {
        in: FIFA_BONUS_QUESTIONS.map((item) => item.code),
      },
    },
    select: {
      code: true,
    },
  });

  const existingCodes = new Set(existing.map((item) => item.code).filter((code): code is string => Boolean(code)));
  const missing = FIFA_BONUS_QUESTIONS.filter((item) => !existingCodes.has(item.code));

  if (missing.length === 0) {
    return 0;
  }

  const [teams, firstMatch] = await Promise.all([
    prisma.team.findMany({
      select: {
        code: true,
        name: true,
        flagEmoji: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.match.findFirst({
      select: {
        kickoffAt: true,
      },
      orderBy: {
        kickoffAt: "asc",
      },
    }),
  ]);

  const teamOptions = buildTeamOptions(teams);
  const deadline = computeDefaultDeadline(firstMatch?.kickoffAt ?? null);

  for (const question of missing) {
    await prisma.bonusQuestion.create({
      data: {
        code: question.code,
        question: question.question,
        points: question.points,
        deadline,
        options: question.optionsSource === "teams" ? teamOptions : PLAYER_SHORTLIST,
      },
    });
  }

  return missing.length;
}