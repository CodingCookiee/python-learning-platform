/**
 * The celebration that replaces confetti: offcuts of belt cloth and tape falling and twisting like
 * ribbon. Each strip is a short length of a belt dye (half of them in the learner's own belt, set
 * on <html> by BeltTheme), keylined so white tape still reads on the sheet; one in three carries a
 * rank bar at its end. Shared by the overlay (components/animations/confetti.tsx) and the canvas
 * burst (components/gamification/confetti.tsx).
 */

/** The dyes, as CSS variables; the learner's own belt is listed twice so it falls more often */
export const TAPE_DYES = [
  "var(--loader-belt)",
  "var(--loader-belt)",
  "var(--belt-yellow)",
  "var(--belt-green)",
  "var(--belt-blue)",
  "var(--belt-brown)",
  "var(--tape)",
] as const;

/** Canvas can't read CSS variables, so the light-theme values stand in until they're resolved */
const FALLBACK: Record<string, string> = {
  "var(--loader-belt)": "oklch(0.52 0.11 162)",
  "var(--belt-yellow)": "oklch(0.88 0.11 93)",
  "var(--belt-green)": "oklch(0.72 0.1 145)",
  "var(--belt-blue)": "oklch(0.66 0.085 240)",
  "var(--belt-brown)": "oklch(0.57 0.065 60)",
  "var(--tape)": "oklch(0.985 0.008 100)",
  "var(--keyline)": "oklch(0.4 0.035 162)",
  "var(--belt-black)": "oklch(0.3 0.03 162)",
};

/** Resolves a `var(--x)` against the page, for the canvas */
export function resolveDye(dye: string): string {
  const name = /^var\((--[\w-]+)\)$/.exec(dye)?.[1];
  if (!name || typeof window === "undefined") return FALLBACK[dye] ?? dye;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) return FALLBACK[dye] ?? dye;
  // --loader-belt is itself a var() on most belts; follow it one step
  return value.startsWith("var(") ? resolveDye(value) : value;
}

export interface TapeStrip {
  id: number;
  /** Horizontal start, 0-1 of the width */
  x: number;
  dye: string;
  width: number;
  length: number;
  /** One in three carries a rank bar across one end */
  ranked: boolean;
  delay: number;
  duration: number;
  /** How far it drifts sideways while it falls, px */
  sway: number;
  /** Its lean, degrees, and how far it turns on the way down */
  tilt: number;
  turn: number;
  /** Seconds per ribbon twist */
  twist: number;
}

/** Strips for one burst; call it once (in state or an effect), never during render */
export function cutStrips(count: number): TapeStrip[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: Math.random(),
    dye: TAPE_DYES[Math.floor(Math.random() * TAPE_DYES.length)]!,
    width: 6 + Math.random() * 3,
    length: 16 + Math.random() * 14,
    ranked: Math.random() < 1 / 3,
    delay: Math.random() * 0.7,
    duration: 2.2 + Math.random() * 1.4,
    sway: (Math.random() - 0.5) * 120,
    tilt: (Math.random() - 0.5) * 50,
    turn: (Math.random() - 0.5) * 140,
    twist: 0.5 + Math.random() * 0.7,
  }));
}
