import { describe, expect, it } from "vitest";
import { remaining } from "@/lib/onramp";

const lesson = (order: number, minutes: number, completed: boolean) => ({
  id: `l${order}`,
  title: `Lesson ${order}`,
  order,
  minutes,
  completed,
});

describe("what's left of the on-ramp", () => {
  it("points at the first unfinished lesson and adds up the minutes still to do", () => {
    const left = remaining([lesson(1, 40, true), lesson(2, 40, true), lesson(3, 40, false), lesson(4, 35, false)]);
    expect(left).toMatchObject({ next: { id: "l3", number: 3 }, done: 2, total: 4, minutesLeft: 75 });
  });

  it("skips ahead when a later lesson was done out of order", () => {
    const left = remaining([lesson(1, 40, true), lesson(2, 40, false), lesson(3, 40, true)]);
    expect(left).toMatchObject({ next: { id: "l2", number: 2 }, done: 2, minutesLeft: 40 });
  });

  it("has nothing next once every lesson is done", () => {
    expect(remaining([lesson(1, 40, true), lesson(2, 40, true)])).toMatchObject({ next: null, done: 2, minutesLeft: 0 });
  });

  it("copes with a module that has no lessons yet", () => {
    expect(remaining([])).toMatchObject({ next: null, done: 0, total: 0, minutesLeft: 0 });
  });
});
