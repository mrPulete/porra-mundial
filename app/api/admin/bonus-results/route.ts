import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessAdminForLeague } from "@/lib/league-admin";
import { prisma } from "@/lib/prisma";
import { recalculateBonusPoints, recalculateRankings } from "@/lib/scoring-engine";

const answerItemSchema = z.object({
  questionId: z.string().min(1),
  // Valor de la opción correcta (option.value). null limpia la respuesta marcada.
  correctAnswer: z.string().min(1).nullable(),
});

const payloadSchema = z.object({
  leagueId: z.string().min(1).optional(),
  answers: z.array(answerItemSchema).min(1),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const { leagueId, answers } = parsed.data;

  if (leagueId) {
    const hasLeagueAccess = await canAccessAdminForLeague(session.user.id, leagueId, session.user.role);
    if (!hasLeagueAccess) {
      return NextResponse.json({ error: "No tienes acceso a esta liga" }, { status: 403 });
    }
  } else if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "leagueId es obligatorio" }, { status: 400 });
  }

  const questionIds = [...new Set(answers.map((item) => item.questionId))];
  const questions = await prisma.bonusQuestion.findMany({
    where: { id: { in: questionIds } },
    select: { id: true },
  });
  const validIds = new Set(questions.map((question) => question.id));

  for (const item of answers) {
    if (!validIds.has(item.questionId)) {
      return NextResponse.json({ error: `Pregunta no valida: ${item.questionId}` }, { status: 400 });
    }
  }

  await prisma.$transaction(
    answers.map((item) =>
      prisma.bonusQuestion.update({
        where: { id: item.questionId },
        data: { correctAnswer: item.correctAnswer === null ? Prisma.DbNull : item.correctAnswer },
      })
    )
  );

  await recalculateBonusPoints(leagueId);
  await recalculateRankings(leagueId);

  return NextResponse.json({
    ok: true,
    updated: answers.length,
    message: `Respuestas correctas guardadas: ${answers.length}`,
  });
}
