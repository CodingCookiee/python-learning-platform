import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Repeat } from "lucide-react";
import { auth } from "@/auth";
import { getReviewQueue } from "@/lib/review";
import { REVIEW_INTERVALS } from "@/lib/mastery-rules";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn } from "@/components/animations";
import { Button } from "@/components/ui/button";

const TYPE_LABEL: Record<string, string> = {
  function: "Write the code",
  program: "Write a program",
  fix: "Fix the bug",
  refactor: "Refactor",
  tests: "Write the tests",
};

const DAY = ["Today", "Tomorrow"];

function dayLabel(i: number) {
  if (i < DAY.length) return DAY[i]!;
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString([], { weekday: "short" });
}

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const queue = await getReviewQueue(session.user.id);
  const first = queue.due[0];
  const overLimit = queue.dueTotal > queue.due.length && queue.due.length === 0;
  const maxUpcoming = Math.max(1, ...queue.upcoming);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Review" }]} />
        </FadeIn>

        <FadeIn delay={0.03}>
          <header className="flex flex-col gap-4 border-b border-border pb-8">
            <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em]">Review</h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Drills you&rsquo;ve solved come back on a widening schedule ({`${REVIEW_INTERVALS.join(", ")} days`}) and you
              solve them again from a blank starter. It&rsquo;s the difference between having done something once and
              being able to do it.
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <p className="font-condensed tabular leading-none">
                <span className="text-5xl font-extrabold tracking-[-0.03em]">{queue.due.length}</span>
                <span className="text-xl font-bold text-muted-foreground"> due today</span>
              </p>
              <p className="font-condensed tabular text-muted-foreground">
                {queue.reviewedToday} reviewed today · {queue.deckSize} in your deck
              </p>
              {first && (
                <Button asChild size="lg" className="ml-auto">
                  <Link href={`/exercises/${first.exerciseId}?review=1`}>
                    Start review
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
          </header>
        </FadeIn>

        <FadeIn delay={0.06}>
          {queue.due.length > 0 ? (
            <ol className="flex flex-col border-t border-border">
              {queue.due.map((item) => (
                <li key={item.exerciseId}>
                  <Link
                    href={`/exercises/${item.exerciseId}?review=1`}
                    className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-sm border-b border-border px-3 py-4 hover:bg-accent/50"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-semibold">{item.title}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {TYPE_LABEL[item.type] ?? item.type} · {item.moduleTitle} · {item.lessonTitle}
                      </span>
                    </span>
                    <span className="font-condensed tabular text-sm whitespace-nowrap text-muted-foreground">
                      {item.lapses > 0 ? `${item.lapses} ${item.lapses === 1 ? "lapse" : "lapses"} · ` : ""}
                      review {item.stage + 1}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex items-start gap-3 rounded-md border border-dashed border-border p-5 text-muted-foreground">
              <Repeat className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p>
                {overLimit
                  ? `That's today's ${queue.dailyLimit}. The rest wait until tomorrow; spacing is the point.`
                  : queue.deckSize === 0
                    ? "Nothing to review yet. Core and stretch drills you solve join your deck and come back the next day."
                    : "Nothing due right now. Come back tomorrow."}
              </p>
            </div>
          )}
        </FadeIn>

        {queue.deckSize > 0 && (
          <FadeIn delay={0.09}>
            <section aria-labelledby="week-heading" className="flex flex-col gap-4">
              <h2 id="week-heading" className="text-xl font-semibold">
                The week ahead
              </h2>
              <ol className="grid grid-cols-7 gap-2" role="list">
                {queue.upcoming.map((n, i) => (
                  <li key={i} className="flex flex-col items-center gap-1.5">
                    <span className="flex h-20 w-full items-end overflow-hidden rounded-[2px] bg-muted">
                      <span
                        className="block w-full bg-primary/70"
                        style={{ height: `${(n / maxUpcoming) * 100}%` }}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="font-condensed tabular text-sm font-bold">{n}</span>
                    <span className="text-xs text-muted-foreground">{dayLabel(i)}</span>
                  </li>
                ))}
              </ol>
              <p className="text-sm text-muted-foreground">
                Today&rsquo;s bar counts what falls due later today. At most {queue.dailyLimit} reviews are offered a day.
              </p>
            </section>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
