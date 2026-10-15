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

/** Snag: a belt cut through, for anything that went wrong */
export function SnagMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M2.5 8.5 H11 L9 15.5 H2.5 Z" />
      <path d="M21.5 8.5 H15 L13 15.5 H21.5 Z" />
    </Mark>
  );
}

/** Knot: the mark itself in outline, for plain notices */
export function KnotMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M2.5 8.5 H9 M15 8.5 H21.5 V14.5 H15 M9 14.5 H2.5 V8.5" />
      <rect x="9" y="5.5" width="6" height="10" />
      <path d="M10.5 15.5 L7.5 21.5 M13.5 15.5 L16.5 21.5" />
    </Mark>
  );
}

/** Sensei: the guide's head and topknot, for the AI help (the Sensei, the drill tutor, hints) */
export function SenseiMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <circle cx="12" cy="4.75" r="2" fill="currentColor" />
      <circle cx="12" cy="13.5" r="6.75" />
      <path d="M5.4 12.2 C9.2 10.2 14.8 10.2 18.6 12.2" />
      <path d="M10.2 16.6 Q12 17.8 13.8 16.6" strokeLinecap="round" strokeWidth={1.5} />
    </Mark>
  );
}

/** Sheet: a ruled page of the syllabus, for records, hand-ins and reference answers */
export function SheetMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="5.5" y="3.5" width="13" height="17" />
      <path d="M8.5 8.5 H15.5 M8.5 12 H15.5 M8.5 15.5 H12.5" strokeWidth={1.5} />
    </Mark>
  );
}
