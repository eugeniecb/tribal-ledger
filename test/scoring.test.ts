import { describe, it, expect } from "vitest";
import {
  settleWager,
  scoreEpisodeCastaways,
  scoreSoleSurvivor,
  validateWager,
  WEEKLY_WAGER_BUDGET,
} from "../lib/scoring";
import type { LeagueMember, WeeklyWager, Castaway, TeamAssignment, EpisodeFacts, SoleSurvivorPick } from "../lib/types";

const makeMember = (id: string, votePoints = 30): LeagueMember => ({
  id,
  league_id: "l1",
  profile_id: id,
  role: "member",
  castaway_points: 0,
  vote_points: votePoints,
  joined_at: "",
});

const makeCastaway = (id: string, name: string, eliminated = false, elim_ep: number | null = null): Castaway => ({
  id,
  season_id: "s1",
  name,
  image_url: null,
  tribe: null,
  is_eliminated: eliminated,
  eliminated_episode: elim_ep,
});

const makeWager = (
  memberId: string,
  budget: Record<string, number>,
  extra: Record<string, number>
): WeeklyWager => ({
  id: "w1",
  member_id: memberId,
  episode_number: 5,
  budget_allocations: budget,
  extra_wagers: extra,
  submitted_at: "",
  locked: false,
});

describe("settleWager", () => {
  const castaways = [
    makeCastaway("c1", "Christian"),
    makeCastaway("c2", "Shauhin"),
  ];

  it("full stacking: budget + extra both correct", () => {
    const member = makeMember("m1", 30);
    const wager = makeWager("m1", { c1: 10 }, { c1: 10 });
    const result = settleWager({ member, wager, votedOutNames: ["Christian"], castaways });
    // Budget 1x: +10, Extra net: +10
    expect(result.deltaVotePoints).toBe(20);
  });

  it("partial stacking: 6 on Christian + 4 on Shauhin, extra 10 on Christian; only Christian goes home", () => {
    const member = makeMember("m1", 30);
    const wager = makeWager("m1", { c1: 6, c2: 4 }, { c1: 10 });
    const result = settleWager({ member, wager, votedOutNames: ["Christian"], castaways });
    // Budget: +6 (c1 correct), 4 on c2 lost (free)
    // Extra: +10 (c1 correct)
    expect(result.deltaVotePoints).toBe(16);
  });

  it("extra wager wrong: loses stake", () => {
    const member = makeMember("m1", 30);
    const wager = makeWager("m1", { c1: 10 }, { c2: 15 });
    const result = settleWager({ member, wager, votedOutNames: ["Christian"], castaways });
    // Budget: +10 (c1 correct)
    // Extra: -15 (c2 wrong)
    expect(result.deltaVotePoints).toBe(-5);
  });

  it("all wrong: budget lost (no negative), extra stake lost", () => {
    const member = makeMember("m1", 30);
    const wager = makeWager("m1", { c2: 10 }, { c2: 10 });
    const result = settleWager({ member, wager, votedOutNames: ["Christian"], castaways });
    // Budget: wrong, no delta (free)
    // Extra: -10 (wrong)
    expect(result.deltaVotePoints).toBe(-10);
  });

  it("example from spec: start 30, budget 10 on Christian, extra 10 on Christian, Christian goes home -> end 50", () => {
    const member = makeMember("m1", 30);
    const wager = makeWager("m1", { c1: 10 }, { c1: 10 });
    const result = settleWager({ member, wager, votedOutNames: ["Christian"], castaways });
    const finalPoints = 30 + result.deltaVotePoints;
    expect(finalPoints).toBe(50);
  });

  it("example from spec: start 30, budget 10 on Christian, extra 10 on Christian, Christian stays -> end 20", () => {
    const member = makeMember("m1", 30);
    const wager = makeWager("m1", { c1: 10 }, { c1: 10 });
    const result = settleWager({ member, wager, votedOutNames: ["Shauhin"], castaways });
    const finalPoints = 30 + result.deltaVotePoints;
    expect(finalPoints).toBe(20);
  });
});

describe("validateWager", () => {
  it("accepts valid wager", () => {
    const errors = validateWager({ c1: 6, c2: 4 }, { c1: 5 }, 30);
    expect(errors).toHaveLength(0);
  });

  it("rejects budget over limit", () => {
    const errors = validateWager({ c1: 10, c2: 1 }, {}, 30);
    expect(errors.some((e) => e.field === "budgetAllocations")).toBe(true);
  });

  it("rejects extra wager over available", () => {
    const errors = validateWager({}, { c1: 31 }, 30);
    expect(errors.some((e) => e.field === "extraWagers")).toBe(true);
  });

  it("rejects negative values", () => {
    const errors = validateWager({ c1: -1 }, { c2: -5 }, 30);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("scoreSoleSurvivor", () => {
  it("picked week 1, wins finale (13 eps total): +13", () => {
    const pick: SoleSurvivorPick = { id: "sp1", member_id: "m1", castaway_id: "c1", selected_at_episode: 1, active: true, created_at: "" };
    const result = scoreSoleSurvivor(pick, "c1", 13);
    expect(result.deltaVotePoints).toBe(13);
  });

  it("picked week 5 (13 eps total): +9", () => {
    const pick: SoleSurvivorPick = { id: "sp1", member_id: "m1", castaway_id: "c1", selected_at_episode: 5, active: true, created_at: "" };
    const result = scoreSoleSurvivor(pick, "c1", 13);
    expect(result.deltaVotePoints).toBe(9);
  });

  it("picked finale week (ep 13): +1", () => {
    const pick: SoleSurvivorPick = { id: "sp1", member_id: "m1", castaway_id: "c1", selected_at_episode: 13, active: true, created_at: "" };
    const result = scoreSoleSurvivor(pick, "c1", 13);
    expect(result.deltaVotePoints).toBe(1);
  });

  it("wrong pick: 0 points", () => {
    const pick: SoleSurvivorPick = { id: "sp1", member_id: "m1", castaway_id: "c1", selected_at_episode: 1, active: true, created_at: "" };
    const result = scoreSoleSurvivor(pick, "c2", 13);
    expect(result.deltaVotePoints).toBe(0);
  });
});

describe("scoreEpisodeCastaways", () => {
  const castaways = [
    makeCastaway("c1", "Christian"),
    makeCastaway("c2", "Shauhin"),
    makeCastaway("c3", "Already Gone", true, 2),
  ];
  const members: LeagueMember[] = [makeMember("m1"), makeMember("m2")];
  const assignments: TeamAssignment[] = [
    { id: "a1", member_id: "m1", castaway_id: "c1", slot: 1 },
    { id: "a2", member_id: "m1", castaway_id: "c2", slot: 2 },
    { id: "a3", member_id: "m2", castaway_id: "c3", slot: 1 },
    { id: "a4", member_id: "m2", castaway_id: "c1", slot: 2 },
  ];
  const facts: EpisodeFacts = {
    episodeNumber: 5,
    votedOutNames: [],
    events: [
      { castawayName: "Christian", eventKey: "individual immunity", sourcePoints: 5 },
      { castawayName: "Shauhin", eventKey: "tribe reward", sourcePoints: 2 },
      { castawayName: "Already Gone", eventKey: "individual immunity", sourcePoints: 5 },
    ],
  };

  it("awards points to team castaways, skips pre-eliminated castaways", () => {
    const deltas = scoreEpisodeCastaways(facts, castaways, members, assignments);
    const m1 = deltas.find((d) => d.memberId === "m1")!;
    const m2 = deltas.find((d) => d.memberId === "m2")!;
    // m1: Christian (5) + Shauhin (2) = 7
    expect(m1.deltaCastawayPoints).toBe(7);
    // m2: Already Gone is pre-eliminated (ep 2 < ep 5), so 0. Christian: 5
    expect(m2.deltaCastawayPoints).toBe(5);
  });
});
