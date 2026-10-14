import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

/** Runs tests/e2e/support/seed.ts and returns its JSON line */
function seed<T>(...args: string[]): T {
  const out = execFileSync("npx", ["tsx", "tests/e2e/support/seed.ts", ...args], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const line = out.trim().split("\n").pop() ?? "null";
  return JSON.parse(line) as T;
}

export type LearnerKind = "developer" | "black-belt";

export function uniqueEmail(label: string): string {
  return `e2e-${label}-${randomUUID().slice(0, 8)}@example.invalid`;
}

export function createLearner(email: string, kind: LearnerKind): void {
  seed("learner", email, kind);
}

export function deleteLearners(...emails: string[]): void {
  if (emails.length > 0) seed("delete", ...emails);
}

export function pythonModule(order: number): { id: string; title: string } {
  return seed("module-id", String(order));
}
