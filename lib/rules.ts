import { z } from "zod";
import type { LeagueRuleSet } from "./types";

export const EVENT_KEYS = [
  "individual immunity",
  "tribe immunity",
  "individual reward",
  "tribe reward",
  "gain immunity idol",
  "gain advantage",
  "voted out",
  "quit/evac",
] as const;

export const GAME_MODES = [
  "classic",
  "high_risk",
  "no_wagers",
  "idol_hunter",
  "custom",
] as const;

export type GameMode = (typeof GAME_MODES)[number];

const eventPointsSchema = z.object({
  "individual immunity": z.number().int().min(-20).max(50),
  "tribe immunity": z.number().int().min(-20).max(50),
  "individual reward": z.number().int().min(-20).max(50),
  "tribe reward": z.number().int().min(-20).max(50),
  "gain immunity idol": z.number().int().min(-20).max(50),
  "gain advantage": z.number().int().min(-20).max(50),
  "voted out": z.number().int().min(-20).max(50),
  "quit/evac": z.number().int().min(-20).max(50),
});

export const leagueRuleSetSchema = z.object({
  game_mode: z.enum(GAME_MODES).optional(),
  event_points: eventPointsSchema,
  weekly_wager_budget: z.number().int().min(0).max(100),
  extra_wager_win_multiplier: z.number().min(0).max(10),
  wagers_enabled: z.boolean(),
  sole_survivor_enabled: z.boolean(),
});

export const DEFAULT_LEAGUE_RULE_SET: LeagueRuleSet = {
  game_mode: "classic",
  event_points: {
    "individual immunity": 5,
    "tribe immunity": 3,
    "individual reward": 2,
    "tribe reward": 2,
    "gain immunity idol": 3,
    "gain advantage": 2,
    "voted out": 0,
    "quit/evac": 0,
  },
  weekly_wager_budget: 10,
  extra_wager_win_multiplier: 1,
  wagers_enabled: true,
  sole_survivor_enabled: true,
};

export const LEAGUE_MODE_PRESETS: Record<Exclude<GameMode, "custom">, LeagueRuleSet> = {
  classic: {
    game_mode: "classic",
    ...DEFAULT_LEAGUE_RULE_SET,
  },
  high_risk: {
    game_mode: "high_risk",
    event_points: {
      "individual immunity": 6,
      "tribe immunity": 4,
      "individual reward": 3,
      "tribe reward": 3,
      "gain immunity idol": 4,
      "gain advantage": 3,
      "voted out": 0,
      "quit/evac": 0,
    },
    weekly_wager_budget: 12,
    extra_wager_win_multiplier: 2,
    wagers_enabled: true,
    sole_survivor_enabled: true,
  },
  no_wagers: {
    game_mode: "no_wagers",
    event_points: {
      "individual immunity": 7,
      "tribe immunity": 4,
      "individual reward": 3,
      "tribe reward": 3,
      "gain immunity idol": 4,
      "gain advantage": 3,
      "voted out": 1,
      "quit/evac": 1,
    },
    weekly_wager_budget: 0,
    extra_wager_win_multiplier: 1,
    wagers_enabled: false,
    sole_survivor_enabled: true,
  },
  idol_hunter: {
    game_mode: "idol_hunter",
    event_points: {
      "individual immunity": 4,
      "tribe immunity": 2,
      "individual reward": 2,
      "tribe reward": 1,
      "gain immunity idol": 8,
      "gain advantage": 6,
      "voted out": 0,
      "quit/evac": 0,
    },
    weekly_wager_budget: 10,
    extra_wager_win_multiplier: 1.5,
    wagers_enabled: true,
    sole_survivor_enabled: true,
  },
};

export function parseLeagueRuleSet(input: unknown): LeagueRuleSet {
  const parsed = leagueRuleSetSchema.safeParse(input);
  return parsed.success
    ? { ...DEFAULT_LEAGUE_RULE_SET, ...parsed.data }
    : DEFAULT_LEAGUE_RULE_SET;
}
