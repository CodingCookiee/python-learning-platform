import { cn } from "@/lib/utils";

/** The mark's parts, shared by both loaders */
function KnotParts({ ink }: { ink: boolean }) {
  return (
    <>
      <g
        fill={ink ? "currentColor" : "var(--loader-belt)"}
        stroke={ink ? "none" : "var(--keyline)"}
        strokeWidth="1.25"
        strokeLinejoin="miter"
      >
        <rect className="knot-band" x="1.5" y="8.5" width="29" height="6" />
        <path className="knot-tail-l" d="M13.6 15.5 L17.4 15.5 L12.2 28.6 L8.4 27.4 Z" />
        <path className="knot-tail-r" d="M14.6 15.5 L18.4 15.5 L23.6 27.4 L19.8 28.6 Z" />
        <rect className="knot-knot" x="11.5" y="5.5" width="9" height="11" />
      </g>
      {!ink && (
        <path
          className="knot-wrap"
          d="M11.5 8.2 L20.5 13.8"
          stroke="var(--keyline)"
          strokeWidth="1.25"
          fill="none"
        />
      )}
    </>
  );
}

/**
 * pylearn's loader: the mark (a belt knot) being tied, as a learner ties their belt before
 * training. The band unrolls, the knot drops on, the tails swing down, it cinches and the wrap is
 * drawn across; a hold, then it's tied again (globals.css, .knot-loader). Drawn in the learner's own
 * belt (the header sets it; the jade accent before that). Decorative: say what's loading beside it.
 */
export function KnotLoader({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn(
        "knot-loader shrink-0 overflow-visible",
        size === "sm" ? "size-5" : size === "md" ? "size-9" : "size-14",
        className
      )}
    >
      <KnotParts ink={false} />
    </svg>
  );
}

/**
 * The knot at button size: solid, in the button's own ink (it follows the text colour on any
 * button), tied on a quicker loop because a button's wait is short. Takes the place of a spinner.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("knot-loader knot-loader-quick size-4 shrink-0 overflow-visible", className)}
    >
      <KnotParts ink />
    </svg>
  );
}
