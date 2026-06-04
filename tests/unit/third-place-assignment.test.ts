import { describe, expect, it } from "vitest";
import { matchThirdsToSlots, THIRD_PLACE_SLOTS } from "@/lib/tournament-tree";

const GROUPS = "ABCDEFGHIJKL".split("");

function combinations<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  const rec = (start: number, combo: T[]) => {
    if (combo.length === k) {
      res.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i += 1) {
      combo.push(arr[i]);
      rec(i + 1, combo);
      combo.pop();
    }
  };
  rec(0, []);
  return res;
}

describe("matchThirdsToSlots", () => {
  const allowedByRef = new Map(THIRD_PLACE_SLOTS.map((slot) => [slot.ref, new Set(slot.allowed)]));

  it("assigns all 8 slots for every one of the 495 group combinations", () => {
    const combos = combinations(GROUPS, 8);
    expect(combos).toHaveLength(495);

    for (const combo of combos) {
      const assignment = matchThirdsToSlots(combo);
      expect(assignment, `combo ${combo.join("")}`).not.toBeNull();

      const groupsAssigned = [...assignment!.values()];
      // Los 8 slots cubiertos, sin huecos.
      expect(assignment!.size).toBe(THIRD_PLACE_SLOTS.length);
      // Cada grupo clasificado usado exactamente una vez.
      expect(new Set(groupsAssigned).size).toBe(combo.length);
      expect([...groupsAssigned].sort()).toEqual([...combo].sort());
      // Cada grupo respeta la whitelist de su slot.
      for (const [ref, group] of assignment!) {
        expect(allowedByRef.get(ref)?.has(group), `${group} no permitido en ${ref}`).toBe(true);
      }
    }
  });

  it("resolves the A-H combination that the previous greedy left incomplete", () => {
    const assignment = matchThirdsToSlots("ABCDEFGH".split(""));
    expect(assignment).not.toBeNull();
    expect(assignment!.size).toBe(8);
    // El grupo G, que el greedy dejaba sin colocar, queda asignado.
    expect([...assignment!.values()]).toContain("G");
  });

  it("is deterministic for a given set of groups", () => {
    const a = matchThirdsToSlots("ABCDEFGH".split(""));
    const b = matchThirdsToSlots("HGFEDCBA".split(""));
    expect([...a!.entries()].sort()).toEqual([...b!.entries()].sort());
  });
});
