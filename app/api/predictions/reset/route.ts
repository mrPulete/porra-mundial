import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveLeagueForUser } from "@/lib/active-league";
import { getPredictionEditPolicy } from "@/lib/prediction-edit-policy";
import { recalculateRankings } from "@/lib/scoring-engine";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    return NextResponse.json({ error: "El admin no participa en pronósticos" }, { status: 403 });
  }

  const leagueContext = await resolveActiveLeagueForUser(session.user.id);
  if (!leagueContext.activeLeagueId) {
    return NextResponse.json({ error: "No hay competición activa" }, { status: 400 });
  }

  const activeLeagueId = leagueContext.activeLeagueId;

  const policy = await getPredictionEditPolicy();
  const isFullyUnlocked = policy.submissionWindowStatus === "OPEN" && policy.canEditGroupStage && policy.canEditKnockoutStage;

  if (!isFullyUnlocked) {
    return NextResponse.json(
      { error: "Solo se puede resetear cuando toda la porra está desbloqueada" },
      { status: 403 }
    );
  }

  const hasLeagueAccess = await prisma.league.findFirst({
    where: {
      id: activeLeagueId,
      OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }],
    },
    select: { id: true },
  });

  if (!hasLeagueAccess) {
    return NextResponse.json({ error: "No tienes acceso a esta competición" }, { status: 403 });
  }

  const deleteResult = await prisma.matchPrediction.deleteMany({
    where: {
      userId: session.user.id,
      leagueId: activeLeagueId,
    },
  });

  await prisma.userLeagueDraft.upsert({
    where: {
      userId_leagueId: {
        userId: session.user.id,
        leagueId: activeLeagueId,
      },
    },
    update: {
      matchDrafts: [],
    },
    create: {
      userId: session.user.id,
      leagueId: activeLeagueId,
      matchDrafts: [],
      bonusDrafts: [],
    },
  });

  await recalculateRankings(activeLeagueId);

  return NextResponse.json({ ok: true, deletedPredictions: deleteResult.count });
}
