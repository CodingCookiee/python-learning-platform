import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/lib/return-path";

describe("where sign-in sends a learner back to", () => {
  it("is a page on this site", () => {
    expect(safeReturnPath("/review")).toBe("/review");
    expect(safeReturnPath("/modules/abc123?tab=drills")).toBe("/modules/abc123?tab=drills");
  });

  it("is never another site (OWASP open redirects)", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "evil.example", "javascript:alert(1)"]) {
      expect(safeReturnPath(bad), bad).toBeNull();
    }
  });

  it("isn't sign-in itself, or anything that isn't a short string", () => {
    expect(safeReturnPath("/auth/signin")).toBeNull();
    expect(safeReturnPath("/auth")).toBeNull();
    expect(safeReturnPath(["/review"])).toBeNull();
    expect(safeReturnPath(undefined)).toBeNull();
    expect(safeReturnPath("/" + "a".repeat(600))).toBeNull();
  });
});
