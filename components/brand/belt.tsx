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
  /** Index of a stripe that was just earned; it animates on in straw yellow */
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
                i < filled ? (i === fresh ? "bg-highlight" : "bg-tape") : "bg-transparent",
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

/** Dashed band for the AI track's dan ranks, which are not open yet */
function DanBand({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "belt-cloth relative flex h-6 items-stretch justify-start border border-dashed border-(--keyline)/70",
        className
      )}
      style={{ color: "var(--keyline)" }}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="my-1.25 ml-1.5 w-1 bg-highlight/80" />
      ))}
    </div>
  );
}

/** The tag tied onto the learner's current belt */
function HereTag({ label }: { label: string }) {
  return (
    <span className="inline-flex w-fit items-center rounded-t-sm bg-highlight px-2 py-0.5 text-xs leading-4 font-semibold whitespace-nowrap text-highlight-foreground">
      {label}
    </span>
  );
}

type Rung = {
  key: string;
  label: string;
  range: string;
  span: number;
  kind: "belt" | "dan";
  belt?: BeltKey;
};

function rungs(showDan: boolean): Rung[] {
  const list: Rung[] = BELTS.map((b) => ({
    key: b.key,
    label: b.label,
    range: kyuRange(b),
    span: b.toModule - b.fromModule + 1,
    kind: "belt",
    belt: b.key,
  }));
  list.push({ key: "black", label: "Black belt", range: "1st dan", span: 2.2, kind: "belt", belt: "black" });
  if (showDan) {
    list.push({
      key: "dan",
      label: "AI automation",
      range: "2nd–9th dan · in preparation",
      span: 3,
      kind: "dan",
    });
  }
  return list;
}

/**
 * The full belt ladder: every Python belt sized by its modules, then black
 * belt, then the dan ranks of the AI track. Horizontal from `sm` up; a
 * vertical list on phones so every label stays whole.
 */
export function BeltLadder({
  currentBelt = "white",
  stripes = 0,
  fresh,
  showDan = true,
  className,
  hereLabel = "You start here",
  earnedLabel,
}: {
  currentBelt?: BeltKey;
  stripes?: number;
  fresh?: number;
  showDan?: boolean;
  className?: string;
  hereLabel?: string;
  /** Tag text once a stripe is on the current belt (e.g. "Stripe earned") */
  earnedLabel?: string;
}) {
  const tagLabel = stripes > 0 && earnedLabel ? earnedLabel : hereLabel;
  const items = rungs(showDan);

  function band(r: Rung, isCurrent: boolean, extra?: string) {
    if (r.kind === "dan") return <DanBand className={extra} />;
    const isPythonBelt = r.belt !== "black";
    return (
      <BeltBand
        belt={r.belt!}
        slots={isPythonBelt ? r.span : 0}
        filled={isCurrent ? stripes : 0}
        fresh={isCurrent ? fresh : undefined}
        className={extra}
      />
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Horizontal ladder */}
      <ol className="hidden w-full items-end gap-2 sm:flex" aria-label="Belt ranks">
        {items.map((r) => {
          const isCurrent = r.kind === "belt" && r.belt === currentBelt;
          return (
            <li
              key={r.key}
              className="flex min-w-0 flex-col"
              style={{ flexGrow: r.span, flexBasis: 0 }}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="flex h-5 items-end">
                {isCurrent && <HereTag label={tagLabel} />}
              </span>
              {band(r, isCurrent)}
              <span className="mt-2 flex min-w-0 flex-col">
                <span className="font-condensed truncate text-sm leading-tight font-bold">
                  {r.label}
                </span>
                <span className="font-condensed tabular truncate text-xs text-muted-foreground">
                  {r.range}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Vertical ladder on phones */}
      <ol className="flex flex-col gap-3 sm:hidden" aria-label="Belt ranks">
        {items.map((r) => {
          const isCurrent = r.kind === "belt" && r.belt === currentBelt;
          return (
            <li
              key={r.key}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4"
              aria-current={isCurrent ? "step" : undefined}
            >
              {band(r, isCurrent, "h-5")}
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="font-condensed text-sm font-bold">{r.label}</span>
                <span className="font-condensed tabular text-xs text-muted-foreground">{r.range}</span>
                {isCurrent && (
                  <span className="rounded-sm bg-highlight px-1.5 text-xs font-semibold text-highlight-foreground">
                    {tagLabel}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
