type RankEntry = {
  position: number;
  name: string;
  points: number;
  exactHits: number;
  accuracy: number;
};

export function RankingsTable({ title, data }: { title: string; data: RankEntry[] }) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg dark:border-white/10 dark:bg-neutral-900/70">
      <h2 className="mb-3 text-lg font-black">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Aun no hay puntuaciones para esta liga.</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">#</th>
                <th>Usuario</th>
                <th>Puntos</th>
                <th>Exactos</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={`${title}-${row.position}-${row.name}`} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2 font-bold">{row.position}</td>
                  <td>{row.name}</td>
                  <td>{row.points}</td>
                  <td>{row.exactHits}</td>
                  <td>{Math.round(row.accuracy * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
