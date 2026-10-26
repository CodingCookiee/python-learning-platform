/**
 * The learner's own days. The server runs in UTC, so "today" for a streak, a daily limit or the
 * training week has to be worked out in the learner's time zone (saved from their browser), or a
 * New York evening lands on tomorrow. Without a known zone everything falls back to UTC.
 *
 * Two kinds of value come out of here:
 * - instants (startOfDay, startOfWeek): where the learner's day or week began, for range queries;
 * - calendar dates (dayKey "2026-10-26", and dates stored as that day's UTC midnight, like a
 *   streak's lastActivityDate or a log's weekOf), which mean the same day wherever they're read.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** The zone if Intl knows it ("America/New_York"), else null: a browser can send anything */
export function validTimeZone(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return null;
  try {
    return formatter(value).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

function zoneOrUtc(timeZone: string | null | undefined): string {
  return (timeZone && validTimeZone(timeZone)) || "UTC";
}

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partsIn(at: Date, timeZone: string): Parts {
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(at)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as unknown as Parts;
}

/** How far the zone's wall clock is ahead of UTC at this instant, in ms */
function offsetMs(at: Date, timeZone: string): number {
  const p = partsIn(at, timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - (at.getTime() - at.getUTCMilliseconds());
}

/** The instant a calendar date's midnight happens in the zone (DST-safe: the offset is re-read at the answer) */
function midnightIn(year: number, month: number, day: number, timeZone: string): Date {
  const wall = Date.UTC(year, month - 1, day);
  let t = wall - offsetMs(new Date(wall), timeZone);
  t = wall - offsetMs(new Date(t), timeZone);
  return new Date(t);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The learner's calendar date at this instant, as "YYYY-MM-DD" */
export function dayKey(at: Date, timeZone?: string | null): string {
  const p = partsIn(at, zoneOrUtc(timeZone));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** A calendar date stored as its UTC midnight (lastActivityDate, weekOf) back to "YYYY-MM-DD" */
export function storedDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" as a date to store: that day's UTC midnight, the same day read from any zone */
export function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Whole calendar days from one "YYYY-MM-DD" to another (positive when `to` is later) */
export function daysBetween(from: string, to: string): number {
  return Math.round((dateFromKey(to).getTime() - dateFromKey(from).getTime()) / 86_400_000);
}

/** The key `days` calendar days after (or before) another */
export function addDaysToKey(key: string, days: number): string {
  return storedDayKey(new Date(dateFromKey(key).getTime() + days * 86_400_000));
}

/** When the learner's day containing `at` began */
export function startOfDay(at = new Date(), timeZone?: string | null): Date {
  const zone = zoneOrUtc(timeZone);
  const p = partsIn(at, zone);
  return midnightIn(p.year, p.month, p.day, zone);
}

/** The Monday that starts the learner's week containing `at`, as "YYYY-MM-DD" (weeks start on Monday) */
export function weekKey(at = new Date(), timeZone?: string | null): string {
  const today = dayKey(at, timeZone);
  const weekday = dateFromKey(today).getUTCDay(); // 0 = Sunday
  return addDaysToKey(today, -((weekday + 6) % 7));
}

/** When a calendar date ("YYYY-MM-DD") began in the learner's zone */
export function startOfDayKey(key: string, timeZone?: string | null): Date {
  const [y, m, d] = key.split("-").map(Number);
  return midnightIn(y!, m!, d!, zoneOrUtc(timeZone));
}

/** Where a learner's week (from its Monday's key) begins and ends, as instants in their zone */
export function weekRange(mondayKey: string, timeZone?: string | null): { start: Date; end: Date } {
  return { start: startOfDayKey(mondayKey, timeZone), end: startOfDayKey(addDaysToKey(mondayKey, 7), timeZone) };
}

/** When the learner's week containing `at` began (Monday, midnight, their time) */
export function startOfWeek(at = new Date(), timeZone?: string | null): Date {
  return weekRange(weekKey(at, timeZone), timeZone).start;
}

/** When the learner's month containing `at` began */
export function startOfMonth(at = new Date(), timeZone?: string | null): Date {
  const zone = zoneOrUtc(timeZone);
  const p = partsIn(at, zone);
  return midnightIn(p.year, p.month, 1, zone);
}
