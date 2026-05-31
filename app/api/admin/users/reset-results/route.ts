import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessAdminForLeague } from "@/lib/league-admin";
import { prisma } from "@/lib/prisma";
import { recalculateFinishedMatchPoints } from "@/lib/scoring-engine";

const payloadSchema = z.object({
  leagueId: z.string().min(1),
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

  const { leagueId } = parsed.data;

  const hasLeagueAccess = await canAccessAdminForLeague(session.user.id, leagueId, session.user.role);
  if (!hasLeagueAccess) {
    return NextResponse.json({ error: "No tienes acceso a esta liga" }, { status: 403 });
  }

  const now = new Date();
  const unlockedMatches = await prisma.match.count({
    where: { lockAt: { gt: now } },
  });

  if (unlockedMatches === 0) {
    return NextResponse.json({ error: "La porra esta bloqueada. Desbloquea una ronda para resetear." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.predictionHistory.deleteMany({ where: { leagueId } });
    await tx.officialSubmission.deleteMany({ where: { leagueId } });
    await tx.userLeagueDraft.deleteMany({ where: { leagueId } });
    await tx.matchPrediction.deleteMany({ where: { leagueId } });
    await tx.bonusAnswer.deleteMany({ where: { leagueId } });
    await tx.ranking.deleteMany({ where: { leagueId } });
  });

  await recalculateFinishedMatchPoints(leagueId);

  return NextResponse.json({
    ok: true,
    message: "Resultados y pronosticos de jugadores reiniciados en la liga",
  });
}
