import { describe, it, expect } from "vitest";
import { isWagerLocked, mostRecentLockAt, lockLabelCT } from "../lib/wager-lock";

// Wednesday 8pm ET lock (Survivor air time). In September, ET = UTC-4.
const WED = 3;
const HOUR = 20;
const premiereAir = new Date("2026-09-24T00:00:00Z"); // Wed 9/23 8:00pm EDT
const ep1Import = new Date("2026-09-24T16:31:00Z"); // Thu 9/24 12:31pm EDT

const locked = (now: string, latestImportAt: Date | null) =>
  isWagerLocked({ now: new Date(now), lockWeekday: WED, lockHourET: HOUR, latestImportAt });

describe("mostRecentLockAt", () => {
  it("finds the Wednesday 8pm ET before a Thursday", () => {
    expect(mostRecentLockAt(new Date("2026-09-24T18:00:00Z"), WED, HOUR).toISOString()).toBe(premiereAir.toISOString());
  });

  it("is exactly the lock moment at air time", () => {
    expect(mostRecentLockAt(premiereAir, WED, HOUR).toISOString()).toBe(premiereAir.toISOString());
  });

  it("goes back a full week on Wednesday before air time", () => {
    expect(mostRecentLockAt(new Date("2026-09-30T20:00:00Z"), WED, HOUR).toISOString()).toBe(premiereAir.toISOString());
  });

  it("stays at 8pm ET across the November DST change", () => {
    // Wed 11/4 8pm EST = 01:00Z Thu 11/5 (DST ended Sun 11/1).
    expect(mostRecentLockAt(new Date("2026-11-06T12:00:00Z"), WED, HOUR).toISOString()).toBe("2026-11-05T01:00:00.000Z");
  });
});

describe("isWagerLocked", () => {
  it("is open for episode 2 the day after episode 1's recap is imported (Thursday)", () => {
    expect(locked("2026-09-24T18:00:00Z", ep1Import)).toBe(false);
  });

  it("is open through the weekend and up to next air time", () => {
    expect(locked("2026-09-26T18:00:00Z", ep1Import)).toBe(false); // Saturday
    expect(locked("2026-09-30T23:59:00Z", ep1Import)).toBe(false); // Wed 7:59pm EDT
  });

  it("locks at air time and stays locked until that episode's recap is imported", () => {
    expect(locked("2026-10-01T00:00:00Z", ep1Import)).toBe(true); // Wed 9/30 8pm EDT
    expect(locked("2026-10-01T09:00:00Z", ep1Import)).toBe(true); // overnight, no import yet
  });

  it("before any import, locks only for a day after air time", () => {
    expect(locked("2026-09-23T18:00:00Z", null)).toBe(false); // premiere day, before air
    expect(locked("2026-09-24T03:00:00Z", null)).toBe(true); // premiere night
    expect(locked("2026-09-25T12:00:00Z", null)).toBe(false); // import never came; reopen
  });
});

describe("lockLabelCT", () => {
  it("labels 8pm ET as 7:00 PM CT", () => {
    expect(lockLabelCT(WED, HOUR)).toBe("Wednesday 7:00 PM CT");
  });
});
