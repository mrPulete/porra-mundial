import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaguesManager } from "@/components/leagues-manager";

export default async function LeaguesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-black">Ligas</h1>
        <p className="text-neutral-600 dark:text-neutral-300">Necesitas iniciar sesión para crear y unirte a ligas.</p>
        <Link href="/login" className="inline-block rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">
          Ir a iniciar sesión
        </Link>
      </main>
    );
  }

  if (session.user.role !== "ADMIN") {
    redirect("/predictions");
  }

  const memberships = await prisma.leagueMember.findMany({
    where: { userId: session.user.id },
    include: {
      league: {
        include: {
          owner: true,
          members: true,
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  const initialLeagues = memberships.map((membership) => ({
    id: membership.league.id,
    name: membership.league.name,
    code: membership.league.code,
    ownerName: membership.league.owner.name,
    membersCount: membership.league.members.length,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
      <h1 className="text-3xl font-black">Ligas</h1>
      <LeaguesManager initialLeagues={initialLeagues} isAdmin={session.user.role === "ADMIN"} />
    </main>
  );
}
