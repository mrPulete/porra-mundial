import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessAdminForLeague } from "@/lib/league-admin";
import { prisma } from "@/lib/prisma";
import { recalculateFinishedMatchPoints } from "@/lib/scoring-engine";

const payloadSchema = z.object({
  leagueId: z.string().min(1),
  userId: z.string().min(1),
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

  const { leagueId, userId } = parsed.data;

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

  const membership = await prisma.leagueMember.findFirst({
    where: { leagueId, userId },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "El usuario no pertenece a esta liga" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.predictionHistory.deleteMany({ where: { leagueId, userId } });
    await tx.officialSubmission.deleteMany({ where: { leagueId, userId } });
    await tx.userLeagueDraft.deleteMany({ where: { leagueId, userId } });
    await tx.matchPrediction.deleteMany({ where: { leagueId, userId } });
    await tx.bonusAnswer.deleteMany({ where: { leagueId, userId } });
    await tx.ranking.deleteMany({ where: { leagueId, userId } });
  });

  await recalculateFinishedMatchPoints(leagueId);

  return NextResponse.json({
    ok: true,
    message: `Pronosticos reseteados para ${targetUser.name}`,
  });
}
