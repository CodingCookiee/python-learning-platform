import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeltTying } from "@/components/brand/belt-tying";
import type { OnRamp } from "@/lib/onramp";

/** "40 minutes", "1 h 20 min" */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** The dashboard's top card while a learner is in the Start on-ramp: the belt, what's left, Continue */
export function OnRampCard({ onRamp }: { onRamp: OnRamp }) {
  const { next, done, total, minutesLeft, moduleId } = onRamp;
  return (
    <section aria-labelledby="onramp-heading" className="flex flex-col gap-5 rounded-md border border-border bg-sheet p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-primary">Before the white belt</p>
          <h2 id="onramp-heading" className="font-condensed text-3xl leading-none font-extrabold tracking-[-0.01em]">
            Start here: tie your white belt
          </h2>
        </div>
        <Link href={`/modules/${moduleId}`} className="text-sm font-medium text-muted-foreground underline hover:text-foreground">
          See all {total} lessons
        </Link>
      </div>
      <BeltTying done={done} total={total} />
      {next && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="leading-relaxed">
            <span className="font-condensed tabular font-bold">
              Lesson {next.number} of {total}
            </span>
            : <span className="font-semibold">{next.title}</span>
            <span className="block text-sm text-muted-foreground">
              About {formatMinutes(minutesLeft)} to go, drills included.
            </span>
          </p>
          <Button size="lg" asChild>
            <Link href={`/lessons/${next.id}`}>
              {done === 0 ? "Start lesson 1" : "Continue"}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

/** The on-ramp's gentle habit goal, beside the streak: encouragement, never a scolding */
export function StreakGoal({ current }: { current: number }) {
  if (current >= 3) return <p className="text-xs text-success">3 days in a row: done. Keep it going.</p>;
  if (current === 0) return <p className="text-xs text-muted-foreground">Aim for 3 days in a row. Today can be day 1.</p>;
  return (
    <p className="text-xs text-muted-foreground">
      Aim for 3 days in a row: <span className="font-condensed tabular font-semibold">{current} of 3</span>.
    </p>
  );
}
