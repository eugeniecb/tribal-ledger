// Wager lock timing. Episodes air weekly at the season's lock weekday/hour (ET).
// Wagers for the upcoming episode lock when it airs and stay locked until its recap is
// imported (the wager page then moves on to the next episode).

const ET = "America/New_York";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function etParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    weekday: WEEKDAYS[get("weekday")] ?? 0,
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

// Most recent lock moment (weekday + hour in ET) at or before `now`.
export function mostRecentLockAt(now: Date, lockWeekday: number, lockHourET: number): Date {
  const p = etParts(now);
  let daysBack = (p.weekday - lockWeekday + 7) % 7;
  if (daysBack === 0 && p.hour < lockHourET) daysBack = 7;

  const msIntoHour = (p.minute * 60 + p.second) * 1000 + now.getUTCMilliseconds();
  let lock = new Date(now.getTime() - daysBack * DAY_MS - (p.hour - lockHourET) * HOUR_MS - msIntoHour);

  // A DST change inside the window shifts the ET hour by one; correct for it.
  const drift = etParts(lock).hour - lockHourET;
  if (drift === 1 || drift === -23) lock = new Date(lock.getTime() - HOUR_MS);
  if (drift === -1 || drift === 23) lock = new Date(lock.getTime() + HOUR_MS);
  return lock;
}

export function isWagerLocked(opts: {
  now: Date;
  lockWeekday: number;
  lockHourET: number;
  // imported_at of the season's latest episode recap, or null before any import.
  latestImportAt: Date | null;
}): boolean {
  const lastLock = mostRecentLockAt(opts.now, opts.lockWeekday, opts.lockHourET);
  if (opts.latestImportAt) {
    // The upcoming episode aired after the last recap import, so its recap is pending.
    return lastLock.getTime() > opts.latestImportAt.getTime();
  }
  // No recaps yet (premiere week): lock for a day after air time, until the first import.
  return opts.now.getTime() - lastLock.getTime() < DAY_MS;
}

export function lockLabelCT(lockWeekday: number, lockHourET: number): string {
  const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][lockWeekday] ?? "Wednesday";
  const hourCT = (lockHourET + 23) % 24;
  const suffix = hourCT >= 12 ? "PM" : "AM";
  const h = hourCT % 12 === 0 ? 12 : hourCT % 12;
  return `${day} ${h}:00 ${suffix} CT`;
}
