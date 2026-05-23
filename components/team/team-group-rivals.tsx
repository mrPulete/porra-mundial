import type { TeamData } from "../team-page";
import TeamLink from "./team-link";

export default function TeamGroupRivals({ teamData }: { teamData: TeamData }) {
  if (!teamData.group || teamData.groupRivals.length === 0) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="font-bold mb-2 text-sm">Grupo {teamData.group}</div>
      <div className="flex flex-col gap-2">
        {/* Current team */}
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
          <span className="text-lg">{teamData.flag}</span>
          <span className="font-semibold text-sm">{teamData.name}</span>
          {teamData.fifaRank && (
            <span className="ml-auto text-xs text-neutral-500">Cabeza de serie {teamData.fifaRank}</span>
          )}
        </div>
        {/* Rivals */}
        {teamData.groupRivals.map((rival) => (
          <div key={rival.code} className="flex items-center gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2">
            <TeamLink teamId={rival.code} name={rival.name} flag={rival.flag} className="text-sm" />
            <span className="ml-auto text-xs text-neutral-500">Bombo {rival.rank}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
