import { describe, expect, it } from "vitest";
import { trackSchema } from "@/lib/content/schema";
import { trackGrade } from "@/lib/curriculum-state";

describe("tracks", () => {
  const start = { slug: "start", title: "Start here", summary: "Programming from zero.", grade: "none", order: 0 };

  it("can give no grade and come before Python", () => {
    expect(trackSchema.safeParse(start).success).toBe(true);
  });

  it("still refuse an unknown grade or a negative order", () => {
    expect(trackSchema.safeParse({ ...start, grade: "belt" }).success).toBe(false);
    expect(trackSchema.safeParse({ ...start, order: -1 }).success).toBe(false);
  });

  it("keep their grade through the curriculum state, unknown ones counting as kyu", () => {
    expect(trackGrade("none")).toBe("none");
    expect(trackGrade("dan")).toBe("dan");
    expect(trackGrade("kyu")).toBe("kyu");
    expect(trackGrade("something else")).toBe("kyu");
  });
});
