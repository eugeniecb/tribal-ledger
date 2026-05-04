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
  event_points: eventPointsSchema,
  weekly_wager_budget: z.number().int().min(0).max(100),
  extra_wager_win_multiplier: z.number().min(0).max(10),
  wagers_enabled: z.boolean(),
  sole_survivor_enabled: z.boolean(),
});

export const DEFAULT_LEAGUE_RULE_SET: LeagueRuleSet = {
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

export function parseLeagueRuleSet(input: unknown): LeagueRuleSet {
  const parsed = leagueRuleSetSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_LEAGUE_RULE_SET;
}

