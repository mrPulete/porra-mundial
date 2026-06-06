import TeamHeader from "./team/team-header";
import TeamRecentForm from "./team/team-recent-form";
import TeamKeyStats from "./team/team-key-stats";
import TeamGroupRivals from "./team/team-group-rivals";
import TeamCalendar from "./team/team-calendar";
import TeamStrengths from "./team/team-strengths";
import TeamSquad from "./team/team-squad";
import TeamHistory from "./team/team-history";
import TeamOdds from "./team/team-odds";
import TeamRecentMatchesApi from "./team/team-recent-matches-api";
import TeamHeadToHead from "./team/team-head-to-head";
import TeamRefreshButton from "./team/team-refresh-button";
import type { TeamFootballInfo } from "@/lib/football-api";

export type CalendarMatch = {
  opponentName: string;
  opponentFlag: string;
  opponentCode: string;
  kickoffAt: string;
  stage: string;
  group: string | null;
  isFinished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  isHome: boolean;
  scored: number | null;
  conceded: number | null;
  totalPredictions: number;
  predictWinPct: number | null;
  predictDrawPct: number | null;
  predictLossPct: number | null;
};

export type TeamData = {
  name: string;
  code: string;
  flag: string;
  group: string | null;
  fifaRank: number | null;
  groupRivals: { code: string; name: string; flag: string; rank: number }[];
  recentForm: { result: string; scored: number; conceded: number; opponent: { name: string; flagEmoji: string; code: string } }[];
  goalsFor: number;
  goalsConceded: number;
  matchesPlayed: number;
  calendar: CalendarMatch[];
  predictionInsights: {
    avgWinPct: number | null;
    totalPredictions: number;
  };
  footballData: TeamFootballInfo | null;
};

export default function TeamPage({ teamId, teamData }: { teamId: string; teamData: TeamData }) {
  const fd = teamData.footballData;
  const nextMatch = teamData.calendar.find((m) => !m.isFinished);

  return (
    <div className="flex flex-col gap-3 p-2 md:p-4 max-w-2xl mx-auto">
      {/* 1. Header - compact hero */}
      <TeamHeader teamData={teamData} nextMatch={nextMatch} />

      {/* 2. Prediction / Tournament Odds */}
      {fd?.odds && <TeamOdds odds={fd.odds} />}

      {/* 3. Recent Form (from API) */}
      {fd && fd.recentMatches.length > 0 ? (
        <TeamRecentMatchesApi matches={fd.recentMatches} stats={fd.stats} />
      ) : (
        <TeamRecentForm teamData={teamData} />
      )}

      {/* 4. Squad / Probable XI */}
      <TeamSquad teamData={teamData} footballData={fd} />

      {/* 5. Key Stats */}
      <TeamKeyStats teamData={teamData} />
      <TeamStrengths teamData={teamData} />

      {/* 6. Group Overview */}
      <TeamGroupRivals teamData={teamData} />

      {/* 7. Head-to-Head vs Next Opponent */}
      {nextMatch && fd && (
        <TeamHeadToHead nextMatch={nextMatch} recentMatches={fd.recentMatches} />
      )}

      {/* 8. Match Calendar */}
      <TeamCalendar teamData={teamData} />

      {/* 9. World Cup Snapshot */}
      <TeamHistory teamData={teamData} footballData={fd} />

      {/* Refresh data button */}
      <TeamRefreshButton teamCode={teamId} />
    </div>
  );
}
