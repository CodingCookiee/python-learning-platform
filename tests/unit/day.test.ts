import { describe, expect, it } from "vitest";
import {
  dateFromKey,
  dayKey,
  daysBetween,
  startOfDay,
  startOfMonth,
  startOfWeek,
  validTimeZone,
  weekKey,
  weekRange,
} from "@/lib/day";
import { nextStreak, streakLapsed } from "@/lib/achievements";

const NY = "America/New_York";

describe("the learner's own day", () => {
  it("keeps a New York evening on that evening, though it's tomorrow in UTC", () => {
    // Monday 26 Oct, 6pm EDT is 22:00Z; Tuesday 9pm EDT is 01:00Z on Wednesday
    const monday = new Date("2026-10-26T22:00:00Z");
    const tuesday = new Date("2026-10-28T01:00:00Z");
    expect(dayKey(monday, NY)).toBe("2026-10-26");
    expect(dayKey(tuesday, NY)).toBe("2026-10-27");
    expect(daysBetween(dayKey(monday, NY), dayKey(tuesday, NY))).toBe(1);
    // In UTC the same two moments are two days apart
    expect(daysBetween(dayKey(monday), dayKey(tuesday))).toBe(2);
  });

  it("puts 7:30pm and 8:30pm on the same evening, across UTC midnight", () => {
    const early = new Date("2026-10-26T23:30:00Z");
    const late = new Date("2026-10-27T00:30:00Z");
    expect(dayKey(early, NY)).toBe(dayKey(late, NY));
  });

  it("starts the day at the learner's midnight", () => {
    expect(startOfDay(new Date("2026-10-27T01:00:00Z"), NY).toISOString()).toBe("2026-10-26T04:00:00.000Z");
    expect(startOfDay(new Date("2026-10-27T01:00:00Z"), "Asia/Karachi").toISOString()).toBe("2026-10-26T19:00:00.000Z");
  });

  it("gets midnight right on both sides of a DST change", () => {
    // New York leaves daylight saving on Sunday 1 Nov 2026 at 2am
    expect(startOfDay(new Date("2026-11-01T15:00:00Z"), NY).toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(startOfDay(new Date("2026-11-02T15:00:00Z"), NY).toISOString()).toBe("2026-11-02T05:00:00.000Z");
    // London enters it on Sunday 29 March 2026 at 1am: that day's midnight is still GMT
    expect(startOfDay(new Date("2026-03-29T12:00:00Z"), "Europe/London").toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(startOfDay(new Date("2026-03-30T12:00:00Z"), "Europe/London").toISOString()).toBe("2026-03-29T23:00:00.000Z");
  });

  it("falls back to UTC for an unknown or missing zone", () => {
    const at = new Date("2026-10-27T01:00:00Z");
    expect(dayKey(at, "Mars/Olympus_Mons")).toBe("2026-10-27");
    expect(dayKey(at, null)).toBe("2026-10-27");
    expect(startOfDay(at, undefined).toISOString()).toBe("2026-10-27T00:00:00.000Z");
  });

  it("accepts only real zones from the browser", () => {
    expect(validTimeZone("Europe/London")).toBe("Europe/London");
    expect(validTimeZone("Mars/Olympus_Mons")).toBeNull();
    expect(validTimeZone("")).toBeNull();
    expect(validTimeZone(42)).toBeNull();
    expect(validTimeZone("x".repeat(100))).toBeNull();
  });
});

describe("the learner's own week and month", () => {
  it("starts on their Monday, stored as that date", () => {
    // Sunday 1 Nov, 9pm in New York is Monday 2 Nov in UTC
    const sundayNight = new Date("2026-11-02T02:00:00Z");
    expect(weekKey(sundayNight, NY)).toBe("2026-10-26");
    expect(weekKey(sundayNight)).toBe("2026-11-02");
    expect(startOfWeek(sundayNight, NY).toISOString()).toBe("2026-10-26T04:00:00.000Z");
    expect(dateFromKey("2026-10-26").toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });

  it("runs from Monday's midnight to the next Monday's, an hour longer over the clock change", () => {
    const { start, end } = weekRange("2026-10-26", NY);
    expect(start.toISOString()).toBe("2026-10-26T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("starts the month at the learner's midnight on the 1st", () => {
    expect(startOfMonth(new Date("2026-11-01T02:00:00Z"), NY).toISOString()).toBe("2026-10-01T04:00:00.000Z");
  });
});

describe("the streak, in the learner's days", () => {
  const on = (key: string, currentStreak: number) => ({ currentStreak, lastActivityDate: dateFromKey(key) });

  it("adds a day for the next day, nothing for the same day, and restarts after a gap", () => {
    expect(nextStreak(on("2026-10-26", 4), "2026-10-27")).toBe(5);
    expect(nextStreak(on("2026-10-27", 5), "2026-10-27")).toBe(5);
    expect(nextStreak(on("2026-10-20", 5), "2026-10-27")).toBe(1);
    // Sign-up dates a zero streak today; the first day of practice counts
    expect(nextStreak(on("2026-10-27", 0), "2026-10-27")).toBe(1);
  });

  it("keeps the New York learner's run across their two evenings", () => {
    const monday = dayKey(new Date("2026-10-26T22:00:00Z"), NY);
    const tuesday = dayKey(new Date("2026-10-28T01:00:00Z"), NY);
    expect(nextStreak(on(monday, 3), tuesday)).toBe(4);
    expect(streakLapsed(on(monday, 3), tuesday)).toBe(false);
  });

  it("lapses only after a whole day without training", () => {
    expect(streakLapsed(on("2026-10-26", 3), "2026-10-27")).toBe(false);
    expect(streakLapsed(on("2026-10-25", 3), "2026-10-27")).toBe(true);
    expect(streakLapsed(on("2026-10-20", 0), "2026-10-27")).toBe(false);
  });

  it("doesn't break a run when the learner moves west and their today is the stored day's eve", () => {
    expect(nextStreak(on("2026-10-27", 6), "2026-10-26")).toBe(6);
    expect(streakLapsed(on("2026-10-27", 6), "2026-10-26")).toBe(false);
  });
});
