import type { TeamData } from "../team-page";
import type { TeamFootballInfo } from "@/lib/football-api";

const positionGroups = [
  { key: "GK", label: "Porteros", icon: "🧤" },
  { key: "DEF", label: "Defensas", icon: "🛡️" },
  { key: "MID", label: "Centrocampistas", icon: "🎯" },
  { key: "FW", label: "Delanteros", icon: "⚡" },
];

type FieldSlot = {
  name: string;
  top: number;
  left: number;
};

function buildFieldSlots(probableXI: string[], formation: string | null): FieldSlot[] {
  if (probableXI.length === 0) {
    return [];
  }

  const keeper = probableXI[0];
  const outfield = probableXI.slice(1, 11);

  const parsedLines = (formation ?? "")
    .split("-")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  const lineSizes = parsedLines.reduce((sum, value) => sum + value, 0) === outfield.length ? parsedLines : [4, 3, 3];

  const minLeft = 18;
  const maxLeft = 82;
  const minTop = 16;
  const maxTop = 84;

  const slots: FieldSlot[] = [{ name: keeper, top: 50, left: minLeft }];
  let cursor = 0;
  const baseLeft = 33;
  const lineGap = lineSizes.length > 1 ? (maxLeft - baseLeft) / (lineSizes.length - 1) : 0;

  for (let lineIndex = 0; lineIndex < lineSizes.length; lineIndex += 1) {
    const playersInLine = lineSizes[lineIndex];
    const left = baseLeft + lineIndex * lineGap;

    for (let i = 0; i < playersInLine; i += 1) {
      const top = minTop + ((i + 1) * (maxTop - minTop)) / (playersInLine + 1);
      const name = outfield[cursor];
      if (!name) {
        continue;
      }
      slots.push({ name, top, left });
      cursor += 1;
    }
  }

  return slots;
}

export default function TeamSquad({ teamData, footballData }: { teamData: TeamData; footballData: TeamFootballInfo | null }) {
  const squad = footballData?.squad || [];
  const probableXI = footballData?.probableXI || [];
  const formation = footballData?.formation;
  const hasSquad = squad.length > 0;
  const hasXI = probableXI.length > 0;
  const fieldSlots = buildFieldSlots(probableXI, formation);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm">
      {/* Probable XI section */}
      {hasXI && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">XI Probable</span>
            {formation && (
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                {formation}
              </span>
            )}
          </div>
          <div className="mb-3 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
            <div className="relative aspect-[10/7] w-full bg-neutral-200 dark:bg-neutral-800">
              <img src="/field.jpg" alt="Plano del campo" className="h-full w-full object-contain" />
              {fieldSlots.map((slot, index) => (
                <div
                  key={`${slot.name}-${index}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ top: `${slot.top}%`, left: `${slot.left}%` }}
                >
                  <div className="max-w-[104px] rounded-md border border-white/50 bg-emerald-700/90 px-1.5 py-1 text-center text-[10px] font-bold text-white shadow-lg backdrop-blur-sm">
                    {slot.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {probableXI.map((name, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px] py-0.5 px-1.5 bg-emerald-50 dark:bg-emerald-900/10 rounded">
                <span className="text-[10px] text-emerald-600 font-bold w-3">{i + 1}</span>
                <span className="truncate font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full squad */}
      {hasSquad ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Convocatoria ({squad.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {positionGroups.map((group) => {
              const players = squad.filter((p) => p.position === group.key);
              if (players.length === 0) return null;
              return (
                <div key={group.key}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs">{group.icon}</span>
                    <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase">
                      {group.label} ({players.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {players.map((p, i) => (
                      <div key={i} className="flex items-center gap-1 text-[11px] py-0.5">
                        {p.number && (
                          <span className="text-neutral-400 w-4 text-right tabular-nums text-[10px]">{p.number}</span>
                        )}
                        <span className={`truncate ${p.starter ? "font-semibold text-emerald-700 dark:text-emerald-300" : ""} ${p.injured ? "text-red-500 line-through" : p.suspended ? "text-amber-500" : ""}`}>
                          {p.name}
                        </span>
                        <span className="text-[9px] text-neutral-400 truncate ml-auto">{p.club}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : !hasXI ? (
        <div>
          <div className="font-bold mb-2 text-sm">Plantilla</div>
          <p className="text-xs text-neutral-500">
            Pulsa &quot;Actualizar datos externos&quot; para cargar la plantilla de {teamData.name}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
