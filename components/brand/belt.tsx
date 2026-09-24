import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { BELTS, beltVar, kyuRange, type BeltKey } from "@/lib/ranks";

/**
 * One belt of cloth: stitch rows along its length, a keyline edge, and a rank
 * bar at the tail end where tape stripes are pressed on as modules are passed.
 */
export function BeltBand({
  belt,
  slots = 0,
  filled = 0,
  fresh,
  faded = 0,
  className,
  barPosition = "end",
}: {
  belt: BeltKey;
  slots?: number;
  filled?: number;
  /** Index of a stripe that was just earned; it animates on */
  fresh?: number;
  /** How many of the earned stripes are fading (skill due for review) */
  faded?: number;
  className?: string;
  barPosition?: "end" | "none";
}) {
  const barColor = belt === "black" ? "var(--seal)" : "var(--belt-black)";
  const style = {
    backgroundColor: beltVar(belt),
    color: "var(--keyline)",
  } as CSSProperties;

  return (
    <div
      className={cn(
        "belt-cloth relative flex h-6 items-stretch justify-end border border-(--keyline)/60",
        belt === "black" && "border-(--keyline)",
        className
      )}
      style={style}
    >
      {barPosition === "end" && slots > 0 && (
        <div
          className="flex h-full items-stretch gap-0.75 px-1.25 py-0.75"
          style={{ backgroundColor: barColor }}
          aria-hidden="true"
        >
          {Array.from({ length: slots }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "w-1.25",
                i < filled ? "bg-tape" : "bg-transparent",
                i < filled && i >= filled - faded && "opacity-35",
                i === fresh && "animate-tape-on"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface LadderModule {
  order: number;
  title: string;
}

/**
 * The full belt ladder: every Python belt sized by its modules, then black
 * belt, then the dan ranks of the AI track.
 */
export function BeltLadder({
  currentBelt = "white",
  stripes = 0,
  fresh,
  showDan = true,
  className,
  hereLabel = "You start here",
}: {
  currentBelt?: BeltKey;
  stripes?: number;
  fresh?: number;
  showDan?: boolean;
  className?: string;
  hereLabel?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <ol className="flex w-full items-end gap-1.5 sm:gap-2" aria-label="Belt ranks">
        {BELTS.map((belt) => {
          const span = belt.toModule - belt.fromModule + 1;
          const isCurrent = belt.key === currentBelt;
          return (
            <li
              key={belt.key}
              className="flex min-w-0 flex-col gap-2"
              style={{ flexGrow: span, flexBasis: 0 }}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "font-condensed h-4 truncate text-[0.6875rem] font-semibold uppercase tracking-[0.04em]",
                  isCurrent ? "text-seal" : "invisible"
                )}
              >
                {isCurrent ? hereLabel : ""}
              </span>
              <BeltBand
                belt={belt.key}
                slots={span}
                filled={isCurrent ? stripes : 0}
                fresh={isCurrent ? fresh : undefined}
              />
              <span className="flex min-w-0 flex-col">
                <span className="font-condensed truncate text-sm leading-tight font-bold">
                  {belt.label}
                </span>
                <span className="font-condensed tabular truncate text-xs text-muted-foreground">
                  {kyuRange(belt)}
                </span>
              </span>
            </li>
          );
        })}
        <li className="flex min-w-0 flex-col gap-2" style={{ flexGrow: 2.2, flexBasis: 0 }}>
          <span className="h-4" aria-hidden="true" />
          <BeltBand belt="black" />
          <span className="flex min-w-0 flex-col">
            <span className="font-condensed truncate text-sm leading-tight font-bold">
              Black belt
            </span>
            <span className="font-condensed truncate text-xs text-muted-foreground">
              1st dan
            </span>
          </span>
        </li>
        {showDan && (
          <li
            className="hidden min-w-0 flex-col gap-2 md:flex"
            style={{ flexGrow: 3, flexBasis: 0 }}
          >
            <span className="h-4" aria-hidden="true" />
            <div
              className="belt-cloth relative flex h-6 items-stretch justify-start border border-dashed border-(--keyline)/70"
              style={{ color: "var(--keyline)" }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="my-1.25 ml-1.5 w-1 bg-(--belt-yellow)/70"
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="flex min-w-0 flex-col">
              <span className="font-condensed truncate text-sm leading-tight font-bold">
                AI automation
              </span>
              <span className="font-condensed truncate text-xs text-muted-foreground">
                2nd–9th dan · in preparation
              </span>
            </span>
          </li>
        )}
      </ol>
    </div>
  );
}
