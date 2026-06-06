import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const backupSchema = z.object({
  leagueId: z.string().min(1),
  exportedAt: z.string(),
  matches: z.array(
    z.object({
      id: z.string(),
      code: z.string().nullable(),
      stage: z.string(),
      homeScore: z.number().nullable(),
      awayScore: z.number().nullable(),
      qualifiedTeamId: z.string().nullable(),
      isFinished: z.boolean(),
    })
  ),
  predictions: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      matchId: z.string(),
      homeScore: z.number(),
      awayScore: z.number(),
      predictedQualifiedTeamId: z.string().nullable(),
    })
  ),
  bonusAnswers: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      questionId: z.string(),
      answer: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = backupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Formato de backup inválido" }, { status: 400 });
  }

  const { leagueId, matches, predictions, bonusAnswers } = parsed.data;

  // Verify user is league owner
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true },
  });

  if (!league || league.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    // Restore match results
    for (const match of matches) {
      if (match.isFinished && match.homeScore !== null && match.awayScore !== null) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            qualifiedTeamId: match.qualifiedTeamId,
            isFinished: true,
          },
        });
      }
    }

    // Restore predictions
    for (const pred of predictions) {
      await prisma.matchPrediction.upsert({
        where: { id: pred.id },
        update: {
          predictedHome: pred.homeScore,
          predictedAway: pred.awayScore,
          predictedQualifiedTeamId: pred.predictedQualifiedTeamId,
        },
        create: {
          id: pred.id,
          userId: pred.userId,
          matchId: pred.matchId,
          leagueId,
          predictedHome: pred.homeScore,
          predictedAway: pred.awayScore,
          predictedQualifiedTeamId: pred.predictedQualifiedTeamId,
        },
      });
    }

    // Restore bonus answers
    for (const answer of bonusAnswers) {
      await prisma.bonusAnswer.upsert({
        where: { id: answer.id },
        update: { answer: answer.answer },
        create: {
          id: answer.id,
          userId: answer.userId,
          questionId: answer.questionId,
          leagueId,
          answer: answer.answer,
        },
      });
    }

    // Recalculate rankings
    await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/admin/recalculate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
      }
    ).catch(() => {});

    return NextResponse.json({
      message: "Backup restaurado exitosamente",
      restored: {
        matches: matches.length,
        predictions: predictions.length,
        bonusAnswers: bonusAnswers.length,
      },
    });
  } catch (error) {
    console.error("Error restoring backup:", error);
    return NextResponse.json({ error: "Error restaurando backup" }, { status: 500 });
  }
}
