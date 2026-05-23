import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveActiveLeagueForUser } from "@/lib/active-league";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const leagueContext = await resolveActiveLeagueForUser(session.user.id);
  if (!leagueContext.activeLeagueId) {
    redirect("/leagues");
  }

  redirect("/predictions");
}

