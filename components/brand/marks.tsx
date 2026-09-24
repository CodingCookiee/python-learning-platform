import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * pylearn's own glyphs for the reward concepts. They share the belt knot's
 * geometry: square-cut, miter joins, a 1.75 stroke in currentColor, drawn on
 * a 24px grid so they sit beside lucide icons at the same weight.
 */

type MarkProps = Omit<SVGProps<SVGSVGElement>, "children"> & { title?: string };

function Mark({ title, className, children, ...rest }: MarkProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinejoin="miter"
      strokeLinecap="square"
      className={cn("size-4 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Streak: consecutive training days, today pressed solid */
export function StreakMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="2.5" y="8.5" width="5" height="7" />
      <rect x="9.5" y="8.5" width="5" height="7" />
      <rect x="16.5" y="8.5" width="5" height="7" fill="currentColor" />
    </Mark>
  );
}

/** XP and level: a strip of tape, the thing a stripe is made of */
export function TapeMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M8.5 3.5 L10.5 5 L12.5 3.5 L14.5 5 L15.5 4.2 V20.5 H8.5 Z" />
      <path d="M8.5 12 H15.5" />
    </Mark>
  );
}

/** Rank: a belt end with its rank bar and two stripes */
export function RankMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="2.5" y="8.5" width="19" height="7" />
      <rect x="14" y="8.5" width="7.5" height="7" fill="currentColor" stroke="none" />
      <path d="M16.5 10 V14 M19 10 V14" stroke="var(--background)" strokeWidth={1.25} />
    </Mark>
  );
}

/** Seal: the examiner's stamp, for anything passed or awarded */
export function SealMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" transform="rotate(-7 12 12)" />
      <rect x="7" y="7" width="10" height="10" transform="rotate(-7 12 12)" strokeWidth={1.25} />
    </Mark>
  );
}

/** Locked: a knot not yet tied, dashed like the ranks still in preparation */
export function LockedMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="3.5" y="8.5" width="17" height="7" strokeDasharray="2.5 2" />
    </Mark>
  );
}
