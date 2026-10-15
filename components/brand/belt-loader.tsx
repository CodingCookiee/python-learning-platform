import { cn } from "@/lib/utils";

const STRIPES = 4;
/** Each stripe starts this long after the one before it (a quarter of the 2.6s loop, less the hold) */
const STAGGER_S = 0.32;

/**
 * pylearn's loader: a length of belt in the learner's own colour (the header sets it; white before
 * that) with stripes of tape pressed on one by one, as a grading earns them, then lifted off for the
 * next pass. Decorative: say what's loading in text beside it (PageLoading does).
 */
export function BeltLoader({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "belt-cloth relative inline-flex shrink-0 items-stretch justify-end border border-(--keyline)/60",
        size === "md" ? "h-5 w-24" : "h-3.5 w-14",
        className
      )}
      style={{ backgroundColor: "var(--loader-belt)", color: "var(--keyline)" }}
    >
      <span
        className={cn(
          "flex h-full items-stretch bg-(--belt-black)",
          size === "md" ? "gap-0.75 px-1.25 py-0.75" : "gap-0.5 px-1 py-0.5"
        )}
      >
        {Array.from({ length: STRIPES }).map((_, i) => (
          <span
            key={i}
            className={cn("animate-loader-stripe", size === "md" ? "w-1.25" : "w-1")}
            style={{ animationDelay: `${i * STAGGER_S}s` }}
          />
        ))}
      </span>
    </span>
  );
}
