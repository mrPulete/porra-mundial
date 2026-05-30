import { BracketBoard } from "@/components/bracket-board";
import { MatchStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export default async function BracketPage() {
  const matches = await prisma.match.findMany({
    where: {
      stage: {
        in: [
          MatchStage.ROUND_OF_32,
          MatchStage.ROUND_OF_16,
          MatchStage.QUARTER_FINAL,
          MatchStage.SEMI_FINAL,
          MatchStage.THIRD_PLACE,
          MatchStage.FINAL,
        ],
      },
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: { roundOrder: "asc" },
  });

  const bracketMatches = matches.map((match) => ({
    id: match.id,
    stage: match.stage,
    group: match.group,
    code: match.excelCode,
    home: { name: match.homeTeam.name, flag: match.homeTeam.flagEmoji },
    away: { name: match.awayTeam.name, flag: match.awayTeam.flagEmoji },
    homeName: match.homeTeam.name,
    homeFlag: match.homeTeam.flagEmoji,
    homeTeamId: match.homeTeam.id,
    awayName: match.awayTeam.name,
    awayFlag: match.awayTeam.flagEmoji,
    awayTeamId: match.awayTeam.id,
    isFinished: match.isFinished,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8">
      <h1 className="text-3xl font-black">Knockout Bracket</h1>
      <p className="text-neutral-600 dark:text-neutral-300">Vista visual de cruces hasta la final, sin marcadores.</p>
      <BracketBoard matches={bracketMatches} visualOnly />
    </main>
  );
}
