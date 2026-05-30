import { MatchStage, UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeagueScoringConfig } from "@/lib/scoring-config";
import { resolveMatchVenue } from "@/lib/match-venues";
import { canAccessAdminForLeague, getLeaguesOwnedByUser } from "@/lib/league-admin";
import { AdminConsole } from "@/components/admin/admin-console";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ leagueId?: string; viewUserId?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-black">Acceso restringido</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">Necesitas iniciar sesión para gestionar tu liga.</p>
      </main>
    );
  }

  const params = await searchParams;

  const leagues = session.user.role === "ADMIN"
    ? await prisma.league.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      })
    : await getLeaguesOwnedByUser(session.user.id);

  const activeLeagueId = params.leagueId && leagues.some((league) => league.id === params.leagueId) ? params.leagueId : leagues[0]?.id;

  if (!activeLeagueId) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-black">Panel Admin</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">No tienes ninguna liga creada para administrar.</p>
      </main>
    );
  }

  const hasLeagueAccess = await canAccessAdminForLeague(session.user.id, activeLeagueId, session.user.role);
  if (!hasLeagueAccess) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-black">Acceso restringido</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">Solo el creador de la liga puede gestionar la administracion de esa liga.</p>
      </main>
    );
  }

  const leagueScoring = await getLeagueScoringConfig(activeLeagueId);

  const [matches, history, leagueMembersRaw, submissions] = await Promise.all([
    prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: [{ kickoffAt: "asc" }, { roundOrder: "asc" }],
    }),
    prisma.predictionHistory.findMany({
      where: { leagueId: activeLeagueId },
      include: {
        user: { select: { name: true } },
        match: {
          include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
        question: { select: { question: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.league.findUnique({
      where: { id: activeLeagueId },
      select: {
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    }),
    prisma.officialSubmission.findMany({
      where: {
        leagueId: activeLeagueId,
      },
      orderBy: [{ userId: "asc" }, { version: "desc" }],
      select: {
        userId: true,
        version: true,
        submittedAt: true,
      },
    }),
  ]);

  const leagueMembers = (() => {
    if (!leagueMembersRaw) {
      return [] as Array<{ id: string; name: string; email: string; isOwner: boolean }>;
    }

    const map = new Map<string, { id: string; name: string; email: string; isOwner: boolean }>();
    if (leagueMembersRaw.owner.role !== UserRole.ADMIN) {
      map.set(leagueMembersRaw.owner.id, {
        id: leagueMembersRaw.owner.id,
        name: leagueMembersRaw.owner.name,
        email: leagueMembersRaw.owner.email,
        isOwner: true,
      });
    }

    for (const member of leagueMembersRaw.members) {
      if (member.user.role === UserRole.ADMIN) {
        continue;
      }

      if (!map.has(member.user.id)) {
        map.set(member.user.id, {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          isOwner: member.user.id === leagueMembersRaw.ownerId,
        });
      }
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  })();

  const latestSubmissionByUser = new Map<string, { version: number; submittedAt: string }>();
  for (const item of submissions) {
    if (!latestSubmissionByUser.has(item.userId)) {
      latestSubmissionByUser.set(item.userId, {
        version: item.version,
        submittedAt: item.submittedAt.toISOString(),
      });
    }
  }

  const predictionCounts = await prisma.matchPrediction.groupBy({
    by: ["userId"],
    where: {
      leagueId: activeLeagueId,
    },
    _count: {
      _all: true,
    },
  });

  const predictionCountByUser = new Map(predictionCounts.map((row) => [row.userId, row._count._all]));

  const adminMatches = matches.map((match) => ({
    ...resolveMatchVenue(match.roundOrder, match.excelCode),
    id: match.id,
    stage: match.stage,
    code: match.excelCode,
    homeName: match.homeTeam.name,
    awayName: match.awayTeam.name,
    homeTeamId: match.homeTeam.id,
    awayTeamId: match.awayTeam.id,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    isFinished: match.isFinished,
    lockAt: match.lockAt,
    group: match.group,
    kickoffAt: match.kickoffAt,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8">
      <h1 className="text-3xl font-black">Panel Admin</h1>
      <AdminConsole
        matches={adminMatches}
        rules={leagueScoring.rules.map((rule) => ({
          id: rule.id,
          stage: rule.stage,
          ruleType: rule.ruleType,
          points: rule.points,
          enabled: rule.enabled,
        }))}
        bonusRules={leagueScoring.bonusRules.map((rule) => ({
          id: rule.id,
          code: rule.code,
          label: rule.label,
          points: rule.points,
          enabled: rule.enabled,
          sortOrder: rule.sortOrder,
        }))}
        penaltyRules={leagueScoring.penaltyRules.map((rule) => ({
          id: rule.id,
          target: rule.target,
          points: rule.points,
          enabled: rule.enabled,
        }))}
        history={history.map((item) => ({
          id: item.id,
          createdAt: item.createdAt.toISOString(),
          userName: item.user.name,
          changeType: item.changeType,
          penaltyApplied: item.penaltyApplied,
          matchLabel: item.match ? `${item.match.homeTeam.name} vs ${item.match.awayTeam.name}` : null,
          questionLabel: item.question?.question ?? null,
        }))}
        leagues={leagues}
        activeLeagueId={activeLeagueId}
        userSubmissionSummaries={leagueMembers.map((member) => {
          const latest = latestSubmissionByUser.get(member.id);
          const savedPredictions = predictionCountByUser.get(member.id) ?? 0;
          const remainingPredictions = Math.max(0, matches.length - savedPredictions);
          return {
            userId: member.id,
            userName: member.name,
            userEmail: member.email,
            isOwner: member.isOwner,
            latestOfficialVersion: latest?.version ?? null,
            latestOfficialSubmittedAt: latest?.submittedAt ?? null,
            savedPredictions,
            remainingPredictions,
            hasOfficialSubmission: Boolean(latest),
          };
        })}
        demoToolsEnabled={session.user.role === "ADMIN" || process.env.ENABLE_DEMO_TOOLS === "true"}
      />
    </main>
  );
}
