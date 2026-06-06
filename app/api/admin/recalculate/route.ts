import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessAdminForLeague } from "@/lib/league-admin";
import { recalculateFinishedMatchPoints, recalculateBonusPoints, recalculateRankings } from "@/lib/scoring-engine";

const payloadSchema = z.object({
  leagueId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const { leagueId } = parsed.data;

  if (leagueId) {
    const hasLeagueAccess = await canAccessAdminForLeague(session.user.id, leagueId, session.user.role);
    if (!hasLeagueAccess) {
      return NextResponse.json({ error: "No tienes acceso a esta liga" }, { status: 403 });
    }
  } else if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "leagueId es obligatorio" }, { status: 400 });
  }

  await recalculateFinishedMatchPoints(leagueId);
  await recalculateBonusPoints(leagueId);
  await recalculateRankings(leagueId);

  return NextResponse.json({ ok: true, message: "Recalculo completado" });
}
