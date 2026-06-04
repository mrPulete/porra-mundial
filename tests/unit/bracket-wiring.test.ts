import { describe, expect, it } from "vitest";
import { KNOCKOUT_WIRING as TREE_WIRING } from "@/lib/tournament-tree";
import { KNOCKOUT_WIRING as DATA_WIRING } from "@/lib/world-cup-data";

describe("knockout wiring consistency", () => {
  it("tournament-tree and world-cup-data describe the same bracket", () => {
    expect(TREE_WIRING).toEqual(DATA_WIRING);
  });

  it("matches the official FIFA 2026 quarter-final pairings", () => {
    // Fuente: bracket oficial FIFA / Wikipedia 2026 World Cup knockout stage.
    expect(TREE_WIRING.W97).toEqual(["W89", "W90"]);
    expect(TREE_WIRING.W98).toEqual(["W93", "W94"]);
    expect(TREE_WIRING.W99).toEqual(["W91", "W92"]);
    expect(TREE_WIRING.W100).toEqual(["W95", "W96"]);
  });

  it("plays the third-place match between the semi-final losers", () => {
    expect(TREE_WIRING.W103).toEqual(["L101", "L102"]);
    expect(DATA_WIRING.W103).toEqual(["L101", "L102"]);
  });

  it("feeds the final from the two semi-final winners", () => {
    expect(TREE_WIRING.W104).toEqual(["W101", "W102"]);
  });
});
