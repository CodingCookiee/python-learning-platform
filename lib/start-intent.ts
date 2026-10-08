/**
 * "I've never coded" on the landing page, remembered through sign-up (Google and GitHub included) so
 * onboarding can pre-select "New to programming" (docs/superpowers/specs/2026-10-08-landing-how-it-works-design.md
 * §5). Only "new" is kept: "I already code" leaves the two developer answers to the learner. Every
 * access survives a browser that blocks storage; then nothing is pre-selected.
 */

const KEY = "pylearn:start";

export type StartIntent = "new";

export function rememberStart(start: string | null | undefined): void {
  if (start !== "new") return;
  try {
    localStorage.setItem(KEY, "new");
  } catch {
    // Not remembered; onboarding just asks
  }
}

export function readStart(): StartIntent | null {
  try {
    return localStorage.getItem(KEY) === "new" ? "new" : null;
  } catch {
    return null;
  }
}

export function forgetStart(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to forget
  }
}
