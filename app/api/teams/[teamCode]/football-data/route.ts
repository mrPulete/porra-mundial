import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshTeamFootballData } from "@/lib/football-api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ teamCode: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { teamCode } = await params;
  const normalized = decodeURIComponent(teamCode).toUpperCase();

  try {
    const data = await refreshTeamFootballData(normalized);
    return NextResponse.json({ ok: true, teamCode: normalized, fetchedAt: data.fetchedAt });
  } catch {
    return NextResponse.json({ error: "No se pudieron refrescar los datos del equipo" }, { status: 500 });
  }
}
