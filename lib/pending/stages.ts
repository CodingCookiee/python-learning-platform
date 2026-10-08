/**
 * The clock behind every "in progress" line (docs/superpowers/plans/2026-10-08-waiting-states-plan.md):
 * a wait moves through its named phases every couple of seconds and holds on the last, and after a
 * while a quieter line reassures that it's still working. Kept apart from React so it can be tested.
 */

export const DEFAULT_STEP_MS = 2200;
export const DEFAULT_STILL_AFTER_MS = 8000;
export const DEFAULT_SLOW_AFTER_MS = 25_000;

export interface StageTiming {
  stepMs?: number;
  stillAfterMs?: number;
  slowAfterMs?: number;
}

/** Which of `count` phases to show `elapsedMs` into the wait */
export function stageIndex(count: number, elapsedMs: number, stepMs = DEFAULT_STEP_MS): number {
  return Math.max(0, Math.min(Math.floor(elapsedMs / stepMs), count - 1));
}

/** How much reassurance the wait needs: none yet, "still working", or "this is a long one" */
export function patience(elapsedMs: number, timing: StageTiming = {}): "none" | "still" | "slow" {
  if (elapsedMs >= (timing.slowAfterMs ?? DEFAULT_SLOW_AFTER_MS)) return "slow";
  if (elapsedMs >= (timing.stillAfterMs ?? DEFAULT_STILL_AFTER_MS)) return "still";
  return "none";
}
