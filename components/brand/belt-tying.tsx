import { cn } from "@/lib/utils";
import { BeltBand } from "@/components/brand/belt";

/**
 * The Start on-ramp's progress: a white belt with a knot for each lesson, filled in green as
 * lessons are finished. All knots filled means the belt is tied, and module 1 is next.
 */
export function BeltTying({ done, total, className }: { done: number; total: number; className?: string }) {
  const tied = total > 0 && done >= total;
  const label = tied
    ? `White belt tied: all ${total} lessons done`
    : `${done} of ${total} lessons done`;
  return (
    <div role="img" aria-label={label} className={cn("relative w-full", className)}>
      <BeltBand belt="white" barPosition="none" className="h-7 w-full" />
      <div className="absolute inset-0 flex items-center justify-around px-4" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rotate-45 border transition-colors duration-500 motion-reduce:transition-none",
              // The cloth is light in both themes, so knots are inked in belt black: filled green when
              // done, an empty outline when not (tape, near white, would vanish into the cloth)
              i < done ? "border-(--belt-black) bg-(--belt-green)" : "border-(--belt-black)/55 bg-transparent"
            )}
          />
        ))}
      </div>
    </div>
  );
}
