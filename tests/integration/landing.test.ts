import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getCourseHours } from "@/lib/landing/facts";

/** The source of truth: each module.yaml's `hours`, summed per track */
function yamlHours(track: string): number {
  const dir = join(process.cwd(), "content", "tracks", track);
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .reduce((sum, d) => {
      const yaml = readFileSync(join(dir, d.name, "module.yaml"), "utf8");
      return sum + Math.round(Number(/^hours:\s*([\d.]+)/m.exec(yaml)?.[1] ?? 0));
    }, 0);
}

describe("the landing page's course hours", () => {
  it("match the synced content, per track", async () => {
    const hours = await getCourseHours();
    expect(hours).toEqual({ start: yamlHours("start"), python: yamlHours("python"), automation: yamlHours("automation") });
    expect(hours.python).toBeGreaterThan(0);
  });
});
