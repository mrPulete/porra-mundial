import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessAdminForLeague } from "@/lib/league-admin";
import {
  generateDemoLeagues,
  generateDemoUsers,
  generatePredictionsForLeague,
  resetTournament,
  simulateNextMatchday,
  simulateNextRound,
  simulateTournament,
} from "@/lib/testing/demo-system";

const demoActionSchema = z.enum([
  "GENERATE_DEMO_USERS",
  "GENERATE_DEMO_LEAGUES",
  "GENERATE_PREDICTIONS",
  "SIMULATE_MATCHDAY",
  "SIMULATE_ROUND",
  "SIMULATE_TOURNAMENT",
  "RESET_TOURNAMENT",
]);

const payloadSchema = z.object({
  action: demoActionSchema,
  leagueId: z.string().min(1).optional(),
  userCount: z.number().int().min(1).max(500).optional(),
  leagueCount: z.number().int().min(1).max(50).optional(),
  maxMembershipsPerUser: z.number().int().min(1).max(20).optional(),
});

async function hasDemoAccess(userId: string, role: string | null | undefined, leagueId?: string) {
  if (role === "ADMIN" || process.env.ENABLE_DEMO_TOOLS === "true") {
    return true;
  }

  if (!leagueId) {
    return false;
  }

  return canAccessAdminForLeague(userId, leagueId, role);
}

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

  const { action, leagueId, userCount, leagueCount, maxMembershipsPerUser } = parsed.data;

  const hasAccess = await hasDemoAccess(session.user.id, session.user.role, leagueId);
  if (!hasAccess) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    if (action === "GENERATE_DEMO_USERS") {
      const result = await generateDemoUsers(userCount ?? 4);

      let assignedToLeague = 0;
      if (leagueId) {
        const hasLeagueAccess = await canAccessAdminForLeague(session.user.id, leagueId, session.user.role);
        if (!hasLeagueAccess) {
          return NextResponse.json({ error: "No tienes acceso a esta liga" }, { status: 403 });
        }

        const assignment = await prisma.leagueMember.createMany({
          data: result.users.map((user) => ({
            leagueId,
            userId: user.id,
            role: "MEMBER",
          })),
          skipDuplicates: true,
        });

        assignedToLeague = assignment.count;
      }

      return NextResponse.json({
        ok: true,
        created: result.created,
        password: result.password,
        assignedToLeague,
        message: `Usuarios demo creados: ${result.created}${leagueId ? ` · añadidos a la liga: ${assignedToLeague}` : ""}`,
      });
    }

    if (!leagueId) {
      return NextResponse.json({ error: "leagueId es obligatorio para esta accion" }, { status: 400 });
    }

    const hasLeagueAccess = await canAccessAdminForLeague(session.user.id, leagueId, session.user.role);
    if (!hasLeagueAccess) {
      return NextResponse.json({ error: "No tienes acceso a esta liga" }, { status: 403 });
    }

    if (action === "GENERATE_DEMO_LEAGUES") {
      const result = await generateDemoLeagues({
        ownerId: session.user.id,
        count: leagueCount ?? 3,
        maxMembershipsPerUser: maxMembershipsPerUser ?? 2,
      });

      return NextResponse.json({
        ok: true,
        created: result.created,
        message: `Ligas demo creadas: ${result.created}`,
      });
    }

    if (action === "GENERATE_PREDICTIONS") {
      const [leagueMembers, totalMatches] = await Promise.all([
        prisma.leagueMember.count({ where: { leagueId } }),
        prisma.match.count(),
      ]);

      if (totalMatches === 0) {
        return NextResponse.json(
          { error: "No hay partidos cargados. Carga/seed de torneo pendiente antes de generar predicciones." },
          { status: 400 }
        );
      }

      if (leagueMembers === 0) {
        return NextResponse.json({ error: "La liga no tiene miembros para generar predicciones." }, { status: 400 });
      }

      const result = await generatePredictionsForLeague(leagueId);
      return NextResponse.json({
        ok: true,
        leagueId: result.leagueId,
        predictions: result.predictions,
        message: `Predicciones generadas: ${result.predictions}`,
      });
    }

    if (action === "SIMULATE_MATCHDAY") {
      const result = await simulateNextMatchday();
      return NextResponse.json({
        ok: true,
        simulated: result.simulated,
        label: result.label,
        message: `Partidos simulados: ${result.simulated}`,
      });
    }

    if (action === "SIMULATE_ROUND") {
      const result = await simulateNextRound();
      return NextResponse.json({
        ok: true,
        simulated: result.simulated,
        label: result.label,
        message: `Partidos simulados: ${result.simulated}`,
      });
    }

    if (action === "SIMULATE_TOURNAMENT") {
      const result = await simulateTournament();
      return NextResponse.json({
        ok: true,
        simulated: result.simulated,
        label: result.label,
        message: `Torneo simulado: ${result.simulated} partidos`,
      });
    }

    const result = await resetTournament();
    return NextResponse.json({
      ok: true,
      resetMatches: result.resetMatches,
      predictions: result.predictions,
      message: "Torneo reiniciado",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error ejecutando accion demo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
