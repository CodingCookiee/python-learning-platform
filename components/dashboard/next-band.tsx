import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NextStep } from "@/lib/next-step";

/** What the band says for each kind of next step: a heading, a line of context, and the one action */
function content(next: Exclude<NextStep, { kind: "none" }>): { title: string; detail: string; action: string; href: string } {
  switch (next.kind) {
    case "reviews":
      return {
        title: `${next.count} ${next.count === 1 ? "drill is" : "drills are"} due for review`,
        detail: "Solve them again from memory to keep them. A clean pass pushes each one further out.",
        action: "Review now",
        href: "/review",
      };
    case "checkpoint-open":
      return {
        title: `Module ${next.moduleOrder}'s checkpoint is open`,
        detail: `${next.moduleTitle}: its clock is still running, so finish what you can and hand it in.`,
        action: "Resume the checkpoint",
        href: `/checkpoints/${next.attemptId}`,
      };
    case "checkpoint-due":
      return {
        title: `Module ${next.moduleOrder}'s checkpoint`,
        detail: `Every lesson in ${next.moduleTitle} is done. Pass the checkpoint for your next stripe: ${next.drills} drills, with ${next.minutes} minutes on the clock once you start.`,
        action: "Go to the checkpoint",
        href: `/modules/${next.moduleId}#checkpoint-heading`,
      };
    case "drill":
      return {
        title: next.title,
        detail: `Drill ${next.index} of ${next.total} in ${next.lessonTitle}${next.draft ? ". Your code is saved where you left it." : "."}`,
        action: "Back to the drill",
        href: `/exercises/${next.exerciseId}`,
      };
    case "lesson":
      return {
        title: next.title,
        detail: `Lesson ${next.index} of ${next.total} in ${next.moduleTitle}, about ${next.minutes} minutes.`,
        action: "Start the lesson",
        href: `/lessons/${next.lessonId}`,
      };
  }
}

/**
 * The top of the dashboard: the one thing to do next, with the one button. Everything else on the
 * page (rank, streak, log, achievements) is the record; this is the way back onto the mat.
 */
export function NextBand({ next }: { next: NextStep }) {
  if (next.kind === "none") return null;
  const { title, detail, action, href } = content(next);
  return (
    <section
      aria-labelledby="next-heading"
      className="flex flex-col gap-5 rounded-md border border-border bg-sheet p-6 sm:flex-row sm:items-center sm:gap-8"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 id="next-heading" className="font-condensed text-2xl leading-tight font-extrabold tracking-[-0.01em] text-balance">
          {title}
        </h2>
        <p className="max-w-2xl text-[0.9875rem] leading-relaxed text-muted-foreground">{detail}</p>
      </div>
      <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
        <Link href={href}>
          {action}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
