import type { TeamData } from "../team-page";
import TeamLink from "./team-link";

const stageLabels: Record<string, string> = {
  GROUP: "Fase de Grupos",
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos",
  SEMI_FINAL: "Semifinal",
  THIRD_PLACE: "Tercer Puesto",
  FINAL: "Final",
};

export default function TeamCalendar({ teamData }: { teamData: TeamData }) {
  if (teamData.calendar.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
        <div className="font-bold mb-2 text-sm">Calendario</div>
        <p className="text-xs text-neutral-500">No hay partidos programados</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="font-bold mb-2 text-sm">Calendario</div>
      <div className="flex flex-col gap-2">
        {teamData.calendar.map((m, i) => {
          const date = new Date(m.kickoffAt);
          const resultEmoji = m.isFinished
            ? m.scored! > m.conceded! ? "✅" : m.scored! < m.conceded! ? "❌" : "➖"
            : null;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                m.isFinished
                  ? "bg-neutral-50 dark:bg-neutral-800/50"
                  : "bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30"
              }`}
            >
              {/* Result or upcoming indicator */}
              <div className="w-5 text-center shrink-0">
                {resultEmoji ? (
                  <span>{resultEmoji}</span>
                ) : (
                  <span className="text-xs text-blue-500">●</span>
                )}
              </div>

              {/* Opponent */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-neutral-500">{m.isHome ? "vs" : "@"}</span>
                  <TeamLink teamId={m.opponentCode} name={m.opponentName} flag={m.opponentFlag} className="text-sm" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-neutral-400">
                    {stageLabels[m.stage] ?? m.stage}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* Score or prediction stats */}
              <div className="shrink-0 text-right">
                {m.isFinished ? (
                  <span className="font-bold text-sm">{m.scored} - {m.conceded}</span>
                ) : m.totalPredictions > 0 ? (
                  <div className="flex flex-col items-end">
                    <div className="flex gap-1 text-[10px]">
                      <span className="text-emerald-600">V {m.predictWinPct}%</span>
                      <span className="text-neutral-400">E {m.predictDrawPct}%</span>
                      <span className="text-red-500">D {m.predictLossPct}%</span>
                    </div>
                    <span className="text-[9px] text-neutral-400">{m.totalPredictions} pronósticos</span>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
