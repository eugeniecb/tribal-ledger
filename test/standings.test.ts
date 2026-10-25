import { describe, it, expect } from "vitest";
import { rankStandings } from "../lib/standings";

const m = (id: string, castaway_points: number, vote_points: number) => ({ id, castaway_points, vote_points });
const summary = (members: { id: string }[], ranked = rankStandings(members as any)) =>
  ranked.map((r: any) => `${r.rank}:${r.id}`);

describe("rankStandings", () => {
  it("orders by total points", () => {
    expect(summary([m("a", 5, 5), m("b", 20, 1), m("c", 1, 1)])).toEqual(["1:b", "2:a", "3:c"]);
  });

  it("breaks total ties by vote points, not castaway points", () => {
    // Meredith 21+12 vs Emily 15+18: both 33, Emily has more vote points.
    expect(summary([m("meredith", 21, 12), m("emily", 15, 18)])).toEqual(["1:emily", "2:meredith"]);
  });

  it("shares a rank on a full tie and skips the next rank", () => {
    expect(summary([m("a", 10, 5), m("b", 10, 5), m("c", 3, 2)])).toEqual(["1:a", "1:b", "3:c"]);
  });

  it("handles a full tie in the middle of the table", () => {
    expect(summary([m("a", 30, 0), m("b", 8, 4), m("c", 8, 4), m("d", 8, 4), m("e", 1, 0)])).toEqual([
      "1:a",
      "2:b",
      "2:c",
      "2:d",
      "5:e",
    ]);
  });

  it("does not share a rank when totals tie but vote points differ", () => {
    expect(summary([m("a", 10, 5), m("b", 5, 10), m("c", 10, 5)])).toEqual(["1:b", "2:a", "2:c"]);
  });

  it("keeps extra member fields", () => {
    const [first] = rankStandings([{ ...m("a", 1, 1), tribe_name: "Tribe" }]);
    expect(first.tribe_name).toBe("Tribe");
    expect(first.rank).toBe(1);
  });
});
