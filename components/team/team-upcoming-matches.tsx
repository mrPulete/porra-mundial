import TeamLink from "./team-link";

type UpcomingMatch = {
  opponentName: string;
  opponentFlag: string;
  opponentCode: string;
  kickoffAt: string;
  stage: string;
};

const stageLabels: Record<string, string> = {
  GROUP: "Fase de Grupos",
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos",
  SEMI_FINAL: "Semifinal",
  THIRD_PLACE: "Tercer Puesto",
  FINAL: "Final",
};

export default function TeamUpcomingMatches({ matches }: { matches: UpcomingMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
        <div className="font-bold mb-2 text-sm">Próximos Partidos</div>
        <p className="text-xs text-neutral-500">No hay partidos próximos</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="font-bold mb-2 text-sm">Próximos Partidos</div>
      <div className="flex flex-col gap-2">
        {matches.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <TeamLink teamId={m.opponentCode} name={m.opponentName} flag={m.opponentFlag} className="font-medium text-sm" />
            <span className="ml-auto text-xs text-neutral-500">
              {new Date(m.kickoffAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-xs text-neutral-400">{stageLabels[m.stage] ?? m.stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
