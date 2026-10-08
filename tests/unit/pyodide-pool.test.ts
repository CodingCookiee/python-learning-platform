import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { PyodidePool } from "../../scripts/content/pyodide-pool.mjs";

const FAKE = fileURLToPath(new URL("../fixtures/fake-pyodide-thread.mjs", import.meta.url));

type Result = { thread?: number; ran?: number; __failure?: string };

let pool: InstanceType<typeof PyodidePool> | null = null;
let root = "";
afterEach(async () => {
  await pool?.close();
  if (root) rmSync(root, { recursive: true, force: true });
});

function makePool(options: { size?: number; maxJobs?: number } = {}) {
  root = mkdtempSync(path.join(tmpdir(), "plp-pool-"));
  pool = new PyodidePool({ root, size: options.size ?? 1, maxJobs: options.maxJobs ?? 100, thread: FAKE });
  return pool;
}

const run = (p: InstanceType<typeof PyodidePool>, behaviour: string, tag = "a") =>
  p.run({ behaviour, tag }, 5000) as Promise<Result>;

describe("the Pyodide pool", () => {
  it("retires a thread after its job allowance, so no interpreter runs forever", async () => {
    const p = makePool({ maxJobs: 3 });
    const results = [];
    for (let i = 0; i < 7; i++) results.push(await run(p, "ok"));
    const threads = [...new Set(results.map((r) => r.thread))];
    expect(threads).toHaveLength(3);
    expect(Math.max(...results.map((r) => r.ran!))).toBe(3);
  });

  it("gives a job one more go on a fresh thread after a fatal error", async () => {
    const p = makePool();
    const result = await run(p, "fatal-once");
    expect(result.__failure).toBeUndefined();
    expect(result.ran).toBe(1);
  });

  it("reports the failure if the fresh thread crashes too, and keeps serving", async () => {
    const p = makePool();
    expect((await run(p, "fatal")).__failure).toBe("Maximum call stack size exceeded");
    expect((await run(p, "ok")).__failure).toBeUndefined();
  });
});
