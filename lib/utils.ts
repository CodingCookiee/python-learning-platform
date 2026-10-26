import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our own page width (max-w-page) and gutter (px-gutter, app/globals.css), so a narrower width or
// padding passed to a component replaces them instead of both applying
const twMerge = extendTailwindMerge({
  extend: {
    theme: { container: ["page"] },
    classGroups: { px: [{ px: ["gutter"] }] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Initials for an avatar tile: first letters of the first two words ("Design Review" → "DR") */
export function initialsFor(name?: string | null, email?: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (email ?? "?").slice(0, 2).toUpperCase();
}
