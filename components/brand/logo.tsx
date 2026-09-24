import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { beltVar, type BeltKey } from "@/lib/ranks";

export type MarkColor = BeltKey | "accent";

function markFill(color: MarkColor): string {
  if (color === "accent") return "var(--primary)";
  // A black belt must keep its mass on the dark ground too
  if (color === "black") return "var(--belt-black-mark)";
  return beltVar(color);
}

/**
 * The pylearn mark: a tied belt knot. Signed-in learners see it in their
 * current belt; everyone else sees it in the jade accent.
 */
export function BeltKnot({
  belt = "accent",
  className,
  title,
}: {
  belt?: MarkColor;
  className?: string;
  title?: string;
}) {
  const style = { "--mark-belt": markFill(belt) } as CSSProperties;
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7 shrink-0", className)}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g
        fill="var(--mark-belt)"
        stroke="var(--keyline)"
        strokeWidth="1.25"
        strokeLinejoin="miter"
      >
        {/* band around the waist */}
        <rect x="1.5" y="8.5" width="29" height="6" />
        {/* tails */}
        <path d="M13.6 15.5 L17.4 15.5 L12.2 28.6 L8.4 27.4 Z" />
        <path d="M14.6 15.5 L18.4 15.5 L23.6 27.4 L19.8 28.6 Z" />
        {/* the knot */}
        <rect x="11.5" y="5.5" width="9" height="11" />
      </g>
      {/* wrap crossing the knot */}
      <path d="M11.5 8.2 L20.5 13.8" stroke="var(--keyline)" strokeWidth="1.25" fill="none" />
    </svg>
  );
}

export function Logo({
  belt = "accent",
  className,
  markClassName,
}: {
  belt?: MarkColor;
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BeltKnot belt={belt} className={markClassName} />
      <span className="font-semicondensed text-[1.3125rem] leading-none font-bold tracking-[-0.03em]">
        pylearn
      </span>
    </span>
  );
}
