import type { Metadata } from "next";
import { Barlow_Condensed, Sora } from "next/font/google";
import { NavBarV2 } from "@/components/nav-bar-v2";
import { AppSessionProvider } from "@/components/session-provider";
import { auth } from "@/lib/auth";
import { resolveActiveLeagueForUser } from "@/lib/active-league";
import "./globals.css";

const APP_VERSION = "0.2.1";

const headingFont = Barlow_Condensed({
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
  subsets: ["latin"],
});

const bodyFont = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Porra Mundial",
  description: "World Cup pool app with bracket, rankings, leagues and admin panel",
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
    apple: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  let userLeagues: Array<{ id: string; name: string; code: string }> = [];
  let activeLeagueId: string | undefined = undefined;

  if (session?.user?.id) {
    const leagueContext = await resolveActiveLeagueForUser(session.user.id);
    userLeagues = leagueContext.userLeagues;
    activeLeagueId = leagueContext.activeLeagueId ?? undefined;
  }

  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[radial-gradient(circle_at_top,_#d1fae5_0%,_#f0fdf4_42%,_#ffffff_100%)] text-neutral-900 dark:bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#0a0a0a_35%,_#020617_100%)] dark:text-neutral-50">
        <AppSessionProvider>
          <div className="min-h-screen">
            <p
              className="pointer-events-none fixed left-2 top-2 z-50 rounded bg-white/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-neutral-600 shadow-sm backdrop-blur dark:bg-neutral-900/70 dark:text-neutral-300"
              aria-label="Version de la porra"
            >
              v{APP_VERSION}
            </p>
            {session?.user?.id ? <NavBarV2 leagues={userLeagues} activeLeagueId={activeLeagueId} /> : null}
            {children}
          </div>
        </AppSessionProvider>
      </body>
    </html>
  );
}
