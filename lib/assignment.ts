import type { AssignmentInput, AssignmentResult } from "./types";

const PICKS_PER_MEMBER = 2;
const BEAM_WIDTH = 50;

// Higher rank (rank=1) gets more preference score
function preferenceScore(rank: number, total: number): number {
  return total - rank + 1;
}

export function runAssignment(input: AssignmentInput): AssignmentResult {
  const { members, castaways, rankings } = input;

  if (members.length === 0 || castaways.length === 0) {
    return { assignments: [], hasDuplicates: false };
  }

  // Build per-member rank map: castaway_id -> score
  const memberScores = new Map<string, Map<string, number>>();
  for (const m of members) {
    memberScores.set(m.id, new Map());
  }
  for (const r of rankings) {
    const scores = memberScores.get(r.member_id);
    if (scores) {
      scores.set(r.castaway_id, preferenceScore(r.rank, castaways.length));
    }
  }

  // Try unique-castaway assignment first, fall back to allowing duplicates
  for (const allowDuplicates of [false, true]) {
    const result = beamSearch(members, castaways, memberScores, allowDuplicates);
    if (result) {
      return result;
    }
  }

  // Fallback: assign first two castaways to everyone (should never happen)
  const fallback = members.flatMap((m) =>
    castaways.slice(0, PICKS_PER_MEMBER).map((c, i) => ({
      member_id: m.id,
      castaway_id: c.id,
      slot: (i + 1) as 1 | 2,
    }))
  );
  return { assignments: fallback, hasDuplicates: true };
}

interface BeamState {
  // member index we've assigned so far
  memberIdx: number;
  // castaway_id -> count of times assigned
  usageCounts: Map<string, number>;
  assignments: { member_id: string; castaway_id: string; slot: 1 | 2 }[];
  // worst member's pair score so far (for fairness objective)
  worstScore: number;
  totalScore: number;
  duplicates: number;
}

function beamSearch(
  members: { id: string }[],
  castaways: { id: string }[],
  memberScores: Map<string, Map<string, number>>,
  allowDuplicates: boolean
): AssignmentResult | null {
  const castawayIds = castaways.map((c) => c.id);

  const initial: BeamState = {
    memberIdx: 0,
    usageCounts: new Map(),
    assignments: [],
    worstScore: Infinity,
    totalScore: 0,
    duplicates: 0,
  };

  let beam: BeamState[] = [initial];

  for (let mi = 0; mi < members.length; mi++) {
    const member = members[mi];
    const scores = memberScores.get(member.id) ?? new Map<string, number>();

    const nextBeam: BeamState[] = [];

    for (const state of beam) {
      // Generate all valid 2-pick pairs for this member
      const pairs = getPairs(castawayIds, state.usageCounts, allowDuplicates);

      for (const [c1, c2] of pairs) {
        const pairScore =
          (scores.get(c1) ?? 0) + (scores.get(c2) ?? 0);
        const newUsage = new Map(state.usageCounts);
        newUsage.set(c1, (newUsage.get(c1) ?? 0) + 1);
        newUsage.set(c2, (newUsage.get(c2) ?? 0) + 1);
        const newDuplicates =
          state.duplicates +
          ((newUsage.get(c1)! > 1 ? 1 : 0) + (newUsage.get(c2)! > 1 ? 1 : 0));

        nextBeam.push({
          memberIdx: mi + 1,
          usageCounts: newUsage,
          assignments: [
            ...state.assignments,
            { member_id: member.id, castaway_id: c1, slot: 1 },
            { member_id: member.id, castaway_id: c2, slot: 2 },
          ],
          worstScore: Math.min(state.worstScore === Infinity ? pairScore : state.worstScore, pairScore),
          totalScore: state.totalScore + pairScore,
          duplicates: newDuplicates,
        });
      }
    }

    if (nextBeam.length === 0) return null;

    // Sort: maximize worstScore (fairness), then minimize duplicates, then maximize total
    nextBeam.sort((a, b) => {
      if (b.worstScore !== a.worstScore) return b.worstScore - a.worstScore;
      if (a.duplicates !== b.duplicates) return a.duplicates - b.duplicates;
      return b.totalScore - a.totalScore;
    });

    beam = nextBeam.slice(0, BEAM_WIDTH);
  }

  const best = beam[0];
  if (!best) return null;

  return {
    assignments: best.assignments,
    hasDuplicates: best.duplicates > 0,
  };
}

function getPairs(
  castawayIds: string[],
  usageCounts: Map<string, number>,
  allowDuplicates: boolean
): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < castawayIds.length; i++) {
    for (let j = i + 1; j < castawayIds.length; j++) {
      const c1 = castawayIds[i];
      const c2 = castawayIds[j];
      if (!allowDuplicates) {
        if ((usageCounts.get(c1) ?? 0) > 0) continue;
        if ((usageCounts.get(c2) ?? 0) > 0) continue;
      }
      pairs.push([c1, c2]);
    }
  }
  return pairs;
}
