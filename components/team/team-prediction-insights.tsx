export default function TeamPredictionInsights({ teamData }: { teamData: TeamData }) {
  const { predictionInsights: pi } = teamData;

  if (pi.totalPredictions === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
        <div className="font-bold mb-2 text-sm">Pronósticos de la Porra</div>
        <p className="text-xs text-neutral-500">Aún no hay pronósticos registrados para {teamData.name}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      <div className="font-bold mb-2 text-sm">Pronósticos de la Porra</div>
      <div className="flex gap-4 items-start flex-wrap">
        {pi.avgWinPct !== null && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-neutral-500">Victoria media</span>
            <div className="w-16 h-3 bg-emerald-200 dark:bg-emerald-900/30 rounded-full overflow-hidden mt-1">
              <div className="h-3 bg-emerald-500 rounded-full" style={{ width: `${pi.avgWinPct}%` }} />
            </div>
            <span className="text-xs font-bold mt-1">{pi.avgWinPct}%</span>
          </div>
        )}
        <div className="flex flex-col items-center">
          <span className="text-xs text-neutral-500">Pronósticos</span>
          <span className="font-bold text-lg mt-1">{pi.totalPredictions}</span>
        </div>
      </div>
    </div>
  );
}
