import type {
  EpisodeFacts,
  Castaway,
  LeagueMember,
  TeamAssignment,
  WeeklyWager,
  SoleSurvivorPick,
  ScoringRules,
  MemberDelta,
  DeltaBreakdownItem,
} from "./types";

export const WEEKLY_WAGER_BUDGET = 10;

// Default scoring: event key -> points
export const DEFAULT_SCORING_RULES: ScoringRules = {
  "individual immunity": 5,
  "tribe immunity": 3,
  "individual reward": 2,
  "tribe reward": 2,
  "gain immunity idol": 3,
  "gain advantage": 2,
  "voted out": 0,
  "quit/evac": 0,
};

// ---- Castaway scoring ----

export function scoreEpisodeCastaways(
  facts: EpisodeFacts,
  castaways: Castaway[],
  members: LeagueMember[],
  assignments: TeamAssignment[],
  rules: ScoringRules = DEFAULT_SCORING_RULES
): MemberDelta[] {
  const eliminatedIds = new Set(
    castaways
      .filter(
        (c) =>
          c.is_eliminated &&
          c.eliminated_episode !== null &&
          c.eliminated_episode < facts.episodeNumber
      )
      .map((c) => c.id)
  );

  const castawayByName = new Map(castaways.map((c) => [c.name.toLowerCase(), c]));

  // Accumulate points per castaway id
  const pointsById = new Map<string, number>();
  for (const event of facts.events) {
    const castaway = castawayByName.get(event.castawayName.toLowerCase());
    if (!castaway) continue;
    if (eliminatedIds.has(castaway.id)) continue;
    const pts = rules[event.eventKey.toLowerCase()] ?? 0;
    pointsById.set(castaway.id, (pointsById.get(castaway.id) ?? 0) + pts);
  }

  // Map assignments by member
  const assignmentsByMember = new Map<string, string[]>();
  for (const a of assignments) {
    if (!assignmentsByMember.has(a.member_id)) {
      assignmentsByMember.set(a.member_id, []);
    }
    assignmentsByMember.get(a.member_id)!.push(a.castaway_id);
  }

  return members.map((member) => {
    const memberCastaways = assignmentsByMember.get(member.id) ?? [];
    const breakdown: DeltaBreakdownItem[] = [];
    let total = 0;

    for (const cid of memberCastaways) {
      const castaway = castaways.find((c) => c.id === cid);
      if (!castaway) continue;
      const pts = pointsById.get(cid) ?? 0;
      if (pts !== 0) {
        breakdown.push({
          source: "castaway",
          castawayName: castaway.name,
          reason: `team castaway`,
          delta: pts,
        });
        total += pts;
      }
    }

    return {
      memberId: member.id,
      deltaCastawayPoints: total,
      deltaVotePoints: 0,
      breakdown,
    };
  });
}

// ---- Wager settlement ----

export interface WagerSettlementInput {
  member: LeagueMember;
  wager: WeeklyWager;
  votedOutNames: string[];
  castaways: Castaway[];
}

export function settleWager({
  member,
  wager,
  votedOutNames,
  castaways,
}: WagerSettlementInput): MemberDelta {
  const votedOutIds = new Set(
    votedOutNames
      .map((n) => castaways.find((c) => c.name.toLowerCase() === n.toLowerCase())?.id)
      .filter(Boolean) as string[]
  );

  const castawayById = new Map(castaways.map((c) => [c.id, c]));
  const breakdown: DeltaBreakdownItem[] = [];
  let deltaVotePoints = 0;

  // Budget allocations: correct = +amount, wrong = lost (free anyway, no negative delta)
  for (const [castawayId, amount] of Object.entries(wager.budget_allocations)) {
    if (amount <= 0) continue;
    const castaway = castawayById.get(castawayId);
    const name = castaway?.name ?? castawayId;
    if (votedOutIds.has(castawayId)) {
      breakdown.push({ source: "wager", castawayName: name, reason: "budget correct", delta: amount });
      deltaVotePoints += amount;
    }
    // wrong allocations: no delta (budget was free)
  }

  // Extra wagers: correct = net +wager, wrong = net -wager
  for (const [castawayId, amount] of Object.entries(wager.extra_wagers)) {
    if (amount <= 0) continue;
    const castaway = castawayById.get(castawayId);
    const name = castaway?.name ?? castawayId;
    if (votedOutIds.has(castawayId)) {
      breakdown.push({ source: "wager", castawayName: name, reason: "extra wager won", delta: amount });
      deltaVotePoints += amount;
    } else {
      breakdown.push({ source: "wager", castawayName: name, reason: "extra wager lost", delta: -amount });
      deltaVotePoints -= amount;
    }
  }

  return {
    memberId: member.id,
    deltaCastawayPoints: 0,
    deltaVotePoints,
    breakdown,
  };
}

// ---- Sole Survivor scoring ----

export function scoreSoleSurvivor(
  pick: SoleSurvivorPick,
  winnerId: string,
  totalEpisodes: number
): MemberDelta {
  const breakdown: DeltaBreakdownItem[] = [];
  let delta = 0;

  if (pick.castaway_id === winnerId) {
    delta = totalEpisodes - pick.selected_at_episode + 1;
    breakdown.push({
      source: "sole_survivor",
      reason: `picked winner at episode ${pick.selected_at_episode}`,
      delta,
    });
  }

  return {
    memberId: pick.member_id,
    deltaCastawayPoints: 0,
    deltaVotePoints: delta,
    breakdown,
  };
}

// ---- Wager validation ----

export interface WagerValidationError {
  field: string;
  message: string;
}

export function validateWager(
  budgetAllocations: Record<string, number>,
  extraWagers: Record<string, number>,
  availableVotePoints: number
): WagerValidationError[] {
  const errors: WagerValidationError[] = [];

  const budgetTotal = Object.values(budgetAllocations).reduce((s, v) => s + v, 0);
  if (budgetTotal > WEEKLY_WAGER_BUDGET) {
    errors.push({
      field: "budgetAllocations",
      message: `Budget allocations total ${budgetTotal} exceeds weekly budget of ${WEEKLY_WAGER_BUDGET}.`,
    });
  }
  for (const [id, v] of Object.entries(budgetAllocations)) {
    if (v < 0) errors.push({ field: `budgetAllocations.${id}`, message: "Allocation cannot be negative." });
  }

  const extraTotal = Object.values(extraWagers).reduce((s, v) => s + v, 0);
  if (extraTotal > availableVotePoints) {
    errors.push({
      field: "extraWagers",
      message: `Extra wagers total ${extraTotal} exceeds available vote points ${availableVotePoints}.`,
    });
  }
  for (const [id, v] of Object.entries(extraWagers)) {
    if (v < 0) errors.push({ field: `extraWagers.${id}`, message: "Wager cannot be negative." });
  }

  return errors;
}
