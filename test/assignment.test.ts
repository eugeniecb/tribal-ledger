import { describe, it, expect } from "vitest";
import { runAssignment } from "../lib/assignment";
import type { AssignmentInput } from "../lib/types";

const members = [
  { id: "m1", display_name: "Alice" },
  { id: "m2", display_name: "Bob" },
  { id: "m3", display_name: "Carol" },
];

const castaways = [
  { id: "c1", name: "Ana" },
  { id: "c2", name: "Ben" },
  { id: "c3", name: "Cara" },
  { id: "c4", name: "Dan" },
  { id: "c5", name: "Eva" },
  { id: "c6", name: "Finn" },
];

// Everyone ranked in order 1-6
const rankings = members.flatMap((m) =>
  castaways.map((c, i) => ({ member_id: m.id, castaway_id: c.id, rank: i + 1 }))
);

describe("runAssignment", () => {
  it("assigns exactly 2 castaways per member", () => {
    const input: AssignmentInput = { members, castaways, rankings };
    const result = runAssignment(input);
    for (const m of members) {
      const memberAssignments = result.assignments.filter((a) => a.member_id === m.id);
      expect(memberAssignments).toHaveLength(2);
    }
  });

  it("produces unique castaways when possible", () => {
    const input: AssignmentInput = { members, castaways, rankings };
    const result = runAssignment(input);
    expect(result.hasDuplicates).toBe(false);
    const ids = result.assignments.map((a) => a.castaway_id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("falls back to duplicates when not enough castaways for all members", () => {
    const twoMembersThreeCastaways: AssignmentInput = {
      members: [
        { id: "m1", display_name: "Alice" },
        { id: "m2", display_name: "Bob" },
        { id: "m3", display_name: "Carol" },
      ],
      castaways: [
        { id: "c1", name: "Ana" },
        { id: "c2", name: "Ben" },
        { id: "c3", name: "Cara" },
      ],
      rankings: [
        { member_id: "m1", castaway_id: "c1", rank: 1 },
        { member_id: "m1", castaway_id: "c2", rank: 2 },
        { member_id: "m1", castaway_id: "c3", rank: 3 },
        { member_id: "m2", castaway_id: "c1", rank: 1 },
        { member_id: "m2", castaway_id: "c2", rank: 2 },
        { member_id: "m2", castaway_id: "c3", rank: 3 },
        { member_id: "m3", castaway_id: "c1", rank: 1 },
        { member_id: "m3", castaway_id: "c2", rank: 2 },
        { member_id: "m3", castaway_id: "c3", rank: 3 },
      ],
    };
    const result = runAssignment(twoMembersThreeCastaways);
    expect(result.hasDuplicates).toBe(true);
    for (const m of twoMembersThreeCastaways.members) {
      const memberAssignments = result.assignments.filter((a) => a.member_id === m.id);
      expect(memberAssignments).toHaveLength(2);
    }
  });

  it("handles empty input gracefully", () => {
    const result = runAssignment({ members: [], castaways: [], rankings: [] });
    expect(result.assignments).toHaveLength(0);
  });

  it("slot values are 1 and 2 per member", () => {
    const input: AssignmentInput = { members, castaways, rankings };
    const result = runAssignment(input);
    for (const m of members) {
      const slots = result.assignments
        .filter((a) => a.member_id === m.id)
        .map((a) => a.slot)
        .sort();
      expect(slots).toEqual([1, 2]);
    }
  });
});
