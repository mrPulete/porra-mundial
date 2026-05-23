import { MatchStage } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessAdminForLeague } from "@/lib/league-admin";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  leagueId: z.string().min(1),
  stage: z.nativeEnum(MatchStage),
  mode: z.enum(["LOCK", "UNLOCK"]).default("LOCK"),
});

const STAGE_ORDER: MatchStage[] = [
  "GROUP",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

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

  const { leagueId, stage, mode } = parsed.data;
  const hasLeagueAccess = await canAccessAdminForLeague(session.user.id, leagueId, session.user.role);

  if (!hasLeagueAccess) {
    return NextResponse.json({ error: "No tienes acceso a esta liga" }, { status: 403 });
  }

  const stageIndex = STAGE_ORDER.indexOf(stage);
  if (stageIndex < 0) {
    return NextResponse.json({ error: "Fase no soportada" }, { status: 400 });
  }

  const targetStages = STAGE_ORDER.slice(stageIndex);

  const now = new Date();
  const lockAt =
    mode === "LOCK"
      ? new Date(now.getTime() - 60 * 1000)
      : new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);

  const updated = await prisma.match.updateMany({
    where: { stage: { in: targetStages } },
    data: { lockAt },
  });

  return NextResponse.json({
    ok: true,
    stage,
    mode,
    affectedStages: targetStages,
    updatedMatches: updated.count,
    lockAt: lockAt.toISOString(),
    message:
      mode === "LOCK"
        ? `Bloqueadas fases desde ${stage} (${updated.count} partidos)`
        : `Desbloqueadas fases desde ${stage} (${updated.count} partidos)`,
  });
}
