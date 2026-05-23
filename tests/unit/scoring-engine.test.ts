import { describe, expect, it } from "vitest";
import { outcomeFromScore } from "@/lib/scoring-engine";

describe("outcomeFromScore", () => {
  it("returns 1 when home team wins", () => {
    expect(outcomeFromScore(2, 1)).toBe("1");
  });

  it("returns 2 when away team wins", () => {
    expect(outcomeFromScore(0, 3)).toBe("2");
  });

  it("returns X when match is a draw", () => {
    expect(outcomeFromScore(1, 1)).toBe("X");
  });
});
