import Link from "next/link";
import { cn } from "@/lib/utils";
import { BeltBand } from "@/components/brand/belt";
import { LockedMark, SealMark } from "@/components/brand/marks";
import { BELTS, kyuRange } from "@/lib/ranks";
import type { SyllabusModule } from "@/lib/syllabus";

function ModuleStatus({ m }: { m: SyllabusModule }) {
  if (m.state === "passed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
        <SealMark className="size-4" />
        Passed
      </span>
    );
  }
  if (m.state === "locked") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <LockedMark className="size-4" />
        Locked
      </span>
    );
  }
  const pct = m.lessonsTotal > 0 ? (m.lessonsDone / m.lessonsTotal) * 100 : 0;
  return (
    <span className="flex items-center gap-2.5">
      <span className="font-condensed tabular text-sm whitespace-nowrap">
        {m.lessonsDone} / {m.lessonsTotal} lessons
      </span>
      <span className="h-1.5 w-16 overflow-hidden rounded-[2px] bg-muted" aria-hidden="true">
        <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

/**
 * The syllabus with the learner's progress: each belt is a row, its modules
 * are ruled lines, and the stripes on each belt are the modules passed in it.
 */
export function SyllabusProgress({
  modules,
  compact = false,
  onlyCurrentBelt = false,
  className,
}: {
  modules: SyllabusModule[];
  /** Compact hides module descriptions (dashboard) */
  compact?: boolean;
  /** Show just the belt the learner is working on (dashboard) */
  onlyCurrentBelt?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {BELTS.filter((belt) => {
        if (!onlyCurrentBelt) return true;
        const current = modules.find((m) => m.state === "current");
        const order = current?.order ?? modules[modules.length - 1]?.order ?? 1;
        return order >= belt.fromModule && order <= belt.toModule;
      }).map((belt) => {
        const beltModules = modules.filter(
          (m) => m.order >= belt.fromModule && m.order <= belt.toModule
        );
        const slots = belt.toModule - belt.fromModule + 1;
        const passed = beltModules.filter((m) => m.state === "passed").length;
        const hasCurrent = beltModules.some((m) => m.state === "current");
        return (
          <section
            key={belt.key}
            aria-labelledby={`sp-${belt.key}`}
            className="grid gap-5 border-t border-border py-7 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10"
          >
            <div className="flex flex-col gap-2.5">
              <BeltBand belt={belt.key} slots={slots} filled={passed} />
              <div className="flex items-baseline justify-between gap-3">
                <h3 id={`sp-${belt.key}`} className="font-condensed text-xl font-bold">
                  {belt.label}
                </h3>
                <span className="font-condensed tabular text-sm text-muted-foreground">
                  {kyuRange(belt)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {passed} of {slots} {slots === 1 ? "stripe" : "stripes"}
                {hasCurrent && (
                  <span className="ml-2 rounded-sm bg-highlight px-1.5 text-xs font-semibold text-highlight-foreground">
                    You are here
                  </span>
                )}
              </span>
            </div>

            <ol className="flex flex-col">
              {beltModules.map((m) => {
                const locked = m.state === "locked";
                const Row = (
                  <>
                    <span className="font-condensed tabular pt-0.5 text-sm text-muted-foreground">
                      {String(m.order).padStart(2, "0")}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("font-semibold", locked && "text-muted-foreground")}>
                        {m.title}
                        {m.state === "current" && (
                          <span className="ml-2 align-middle text-xs font-semibold text-primary">
                            Next stripe
                          </span>
                        )}
                      </span>
                      {!compact && (
                        <span className="line-clamp-2 text-sm text-muted-foreground">
                          {m.description}
                        </span>
                      )}
                      <span className="font-condensed tabular text-xs text-muted-foreground">
                        {m.lessonsTotal} {m.lessonsTotal === 1 ? "lesson" : "lessons"}
                        {m.projectsTotal > 0 && ` · capstone project`} · ~{m.duration} h
                      </span>
                    </span>
                    <span className="self-center justify-self-end">
                      <ModuleStatus m={m} />
                    </span>
                  </>
                );
                const rowClass =
                  "grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-border/70 py-3.5 last:border-b-0";
                return (
                  <li key={m.id}>
                    {locked ? (
                      <div className={cn(rowClass, "opacity-75")} aria-disabled="true">
                        {Row}
                      </div>
                    ) : (
                      <Link
                        href={`/modules/${m.id}`}
                        className={cn(
                          rowClass,
                          "-mx-3 rounded-sm px-3 hover:bg-accent/50",
                          m.state === "current" && "bg-accent/40"
                        )}
                      >
                        {Row}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
