import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BeltBand, BeltLadder } from "@/components/brand/belt";
import type { LearnerRank } from "@/lib/learner-rank";
import type { BlackBeltStatus } from "@/lib/black-belt";

function Requirement({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      {done ? (
        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="Done" />
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Not yet" />
      )}
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/** The black belt grading: what's left once every module is passed */
function BlackBeltGrading({ status }: { status: BlackBeltStatus }) {
  const weak = status.topics.filter((t) => t.strength < 0.8).slice(0, 6);
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      <p>
        <span className="font-semibold">Black belt grading. </span>
        <span className="text-muted-foreground">Every module is passed. The black belt means you can use it without looking it up:</span>
      </p>
      <ul className="flex flex-col gap-2 text-sm" role="list">
        <Requirement done={status.checkpoints.passed === status.checkpoints.total}>
          All {status.checkpoints.total} checkpoints passed
        </Requirement>
        <Requirement done={status.topicsMet === status.topics.length}>
          Advanced topics held at 80%:{" "}
          <span className="font-condensed tabular">
            {status.topicsMet} of {status.topics.length}
          </span>
          {weak.length > 0 && (
            <span className="text-muted-foreground">
              {" "}
              (weakest: {weak.map((t) => `${t.tag} ${Math.round(t.strength * 100)}%`).join(", ")}). Reviews raise them.
            </span>
          )}
        </Requirement>
        <Requirement done={status.capstones.approved >= status.capstones.needed}>
          Capstones approved:{" "}
          <span className="font-condensed tabular">
            {status.capstones.approved} of {status.capstones.needed}
          </span>
        </Requirement>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/review">
            Review queue
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/modules">Capstones in the syllabus</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * The learner's rank at a glance: the grade set at poster scale, their belt
 * with the stripes earned so far, and the one module that earns the next.
 */
export function RankCard({
  rank,
  showLadder = true,
  className,
}: {
  rank: LearnerRank;
  showLadder?: boolean;
  className?: string;
}) {
  const next = rank.nextModule;
  const nextStripe = rank.stripes + 1;

  return (
    <section
      aria-label={`Your rank: ${rank.label}, ${rank.beltLabel}`}
      className={cn("rounded-md border border-border bg-sheet", className)}
    >
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-14">
        {/* Grade */}
        <div className="flex items-end gap-3">
          <span className="font-condensed tabular text-[6.5rem] leading-[0.78] font-extrabold tracking-[-0.035em] sm:text-[8rem]">
            {rank.numeral}
          </span>
          <span className="flex flex-col pb-1.5">
            <span className="font-condensed text-3xl leading-none font-bold">{rank.grade}</span>
            <span className="mt-1 text-sm text-muted-foreground">{rank.beltLabel}</span>
          </span>
        </div>

        {/* Belt and what's next */}
        <div className="flex flex-col gap-5">
          {rank.stripeSlots > 0 && (
            <div className="flex flex-col gap-2">
              <BeltBand
                belt={rank.belt}
                slots={rank.stripeSlots}
                filled={rank.stripes}
                className="h-8"
              />
              <span className="font-condensed tabular text-sm text-muted-foreground">
                {rank.stripes} of {rank.stripeSlots} stripes on your {rank.beltLabel.toLowerCase()}
              </span>
            </div>
          )}

          {next ? (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <p className="min-w-0 max-w-xl">
                <span className="font-semibold">Next stripe: </span>
                pass module {next.order}, {next.title}.{" "}
                <span className="font-condensed tabular text-muted-foreground">
                  {next.lessonsDone} of {next.lessonsTotal} lessons done
                </span>
              </p>
              <Button asChild>
                <Link href={`/modules/${next.id}`}>
                  {next.lessonsDone > 0 ? "Continue" : `Start stripe ${nextStripe}`}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : rank.blackBeltPending ? (
            <BlackBeltGrading status={rank.blackBeltPending} />
          ) : (
            <p className="border-t border-border pt-5 font-semibold">
              Black belt earned. The AI automation dan ranks are next.
            </p>
          )}
        </div>
      </div>

      {showLadder && (
        <div className="border-t border-border px-6 pt-4 pb-6 sm:px-8">
          <BeltLadder
            currentBelt={rank.belt === "black" ? "brown" : rank.belt}
            stripes={rank.belt === "black" ? 0 : rank.stripes}
            hereLabel="You are here"
          />
        </div>
      )}
    </section>
  );
}
