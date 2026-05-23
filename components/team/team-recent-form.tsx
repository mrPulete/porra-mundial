import type { TeamData } from "../team-page";
import TeamLink from "./team-link";

export default function TeamRecentForm({ teamData }: { teamData: TeamData }) {
  if (teamData.recentForm.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
        <span className="text-sm text-neutral-500">Sin partidos disputados aún</span>
      </div>
    );
  }

  const icons: Record<string, string> = { W: "✅", D: "➖", L: "❌" };

  return (
    <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 text-lg">
          {teamData.recentForm.map((f, i) => (
            <span key={i} title={`vs ${f.opponent.name} (${f.scored}-${f.conceded})`}>
              {icons[f.result] ?? "➖"}
            </span>
          ))}
        </div>
        <div className="ml-auto flex gap-3 text-xs text-neutral-600 dark:text-neutral-300">
          <span>GF: <span className="font-bold">{teamData.goalsFor}</span></span>
          <span>GC: <span className="font-bold">{teamData.goalsConceded}</span></span>
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {teamData.recentForm.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span>{icons[f.result]}</span>
            <TeamLink teamId={f.opponent.code} name={f.opponent.name} flag={f.opponent.flagEmoji} className="text-xs" />
            <span className="ml-auto text-neutral-500">{f.scored} - {f.conceded}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
