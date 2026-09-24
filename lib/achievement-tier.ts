/**
 * Achievement tiers, coloured from the palette (never stock Tailwind hues).
 * Bronze is cocoa cloth, silver the keyline, gold the straw highlight,
 * platinum the jade accent, legendary the ink itself.
 */

export type TierKey = "bronze" | "silver" | "gold" | "platinum" | "legendary";

export interface TierStyle {
  key: TierKey;
  label: string;
  /** Border / stitch colour of the patch */
  thread: string;
  /** Colour for the icon and tier text; readable on the patch fill */
  ink: string;
  /** Patch fill */
  fill: string;
}

const TIERS: Record<TierKey, TierStyle> = {
  bronze: {
    key: "bronze",
    label: "Bronze",
    thread: "var(--belt-brown)",
    ink: "var(--belt-brown)",
    fill: "color-mix(in oklch, var(--belt-brown) 12%, var(--sheet))",
  },
  silver: {
    key: "silver",
    label: "Silver",
    thread: "var(--keyline)",
    ink: "var(--muted-foreground)",
    fill: "color-mix(in oklch, var(--keyline) 10%, var(--sheet))",
  },
  gold: {
    key: "gold",
    label: "Gold",
    thread: "var(--highlight)",
    ink: "var(--highlight-foreground)",
    fill: "color-mix(in oklch, var(--highlight) 30%, var(--sheet))",
  },
  platinum: {
    key: "platinum",
    label: "Platinum",
    thread: "var(--primary)",
    ink: "var(--primary)",
    fill: "color-mix(in oklch, var(--primary) 12%, var(--sheet))",
  },
  legendary: {
    key: "legendary",
    label: "Legendary",
    thread: "var(--foreground)",
    ink: "var(--highlight)",
    fill: "var(--foreground)",
  },
};

export function tierStyle(tier: string | null | undefined): TierStyle {
  const key = (tier ?? "").trim().toLowerCase() as TierKey;
  return TIERS[key] ?? TIERS.bronze;
}
