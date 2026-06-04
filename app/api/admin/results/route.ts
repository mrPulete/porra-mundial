import { MatchStage } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessAdminForLeague } from "@/lib/league-admin";
import { prisma } from "@/lib/prisma";
import { recalculateFinishedMatchPoints } from "@/lib/scoring-engine";

const resultItemSchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  qualifiedTeamId: z.string().min(1).nullable().optional(),
});

const payloadSchema = z.object({
  leagueId: z.string().min(1).optional(),
  results: z.array(resultItemSchema).min(1),
});

function isKnockout(stage: MatchStage) {
  return stage !== "GROUP";
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

  const { leagueId, results } = parsed.data;

  if (leagueId) {
    const hasLeagueAccess = await canAccessAdminForLeague(session.user.id, leagueId, session.user.role);
    if (!hasLeagueAccess) {
      return NextResponse.json({ error: "No tienes acceso a esta liga" }, { status: 403 });
    }
  } else if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "leagueId es obligatorio" }, { status: 400 });
  }

  const matches = await prisma.match.findMany({
    where: {
      id: {
        in: results.map((item) => item.matchId),
      },
    },
    select: {
      id: true,
      stage: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  const matchById = new Map(matches.map((match) => [match.id, match]));

  for (const row of results) {
    const match = matchById.get(row.matchId);
    if (!match) {
      return NextResponse.json({ error: `Partido no encontrado: ${row.matchId}` }, { status: 400 });
    }

    const isDraw = row.homeScore === row.awayScore;
    if (isKnockout(match.stage) && isDraw) {
      if (!row.qualifiedTeamId) {
        return NextResponse.json({ error: "En cruces empatados debes indicar quien clasifica" }, { status: 400 });
      }

      if (row.qualifiedTeamId !== match.homeTeamId && row.qualifiedTeamId !== match.awayTeamId) {
        return NextResponse.json({ error: "Clasificado invalido para ese partido" }, { status: 400 });
      }
    }
  }

  await prisma.$transaction(
    results.map((row) =>
      prisma.match.update({
        where: { id: row.matchId },
        data: {
          homeScore: row.homeScore,
          awayScore: row.awayScore,
          qualifiedTeamId: row.qualifiedTeamId ?? null,
          isFinished: true,
        },
      })
    )
  );

  // Un resultado es un hecho global (la tabla Match es compartida por todas las ligas), así que se
  // recalculan los puntos de TODAS las ligas, no solo la del admin que carga el resultado.
  await recalculateFinishedMatchPoints();

  // Invalida las páginas que muestran resultados/puntos para que el usuario vea
  // los datos actualizados en el siguiente refresco sin esperar a que expire la caché.
  revalidatePath("/predictions");
  revalidatePath("/rankings");
  revalidatePath("/matches");
  revalidatePath("/bracket");

  return NextResponse.json({
    ok: true,
    updated: results.length,
    message: `Resultados guardados: ${results.length}`,
  });
}
