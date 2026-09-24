import { redirect } from "next/navigation";
import Link from "next/link";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import { ArrowRight, Check } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { BeltBand } from "@/components/brand/belt";
import { Seal } from "@/components/brand/seal";
import { Hero } from "@/components/landing/hero";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { BELTS, DAN_TRACK, beltForModule, kyuRange, ordinal } from "@/lib/ranks";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);

function highlight(code: string, language: "javascript" | "python") {
  return hljs.highlight(code, { language }).value;
}

const BRIDGE: Array<{ concept: string; js: string; py: string }> = [
  {
    concept: "Transform a list",
    js: "const doubled = nums.map((n) => n * 2);",
    py: "doubled = [n * 2 for n in nums]",
  },
  {
    concept: "Destructure",
    js: "const [first, ...rest] = items;",
    py: "first, *rest = items",
  },
  {
    concept: "Run requests concurrently",
    js: "await Promise.all([getUser(), getOrders()]);",
    py: "await asyncio.gather(get_user(), get_orders())",
  },
  {
    concept: "Validate data",
    js: "const User = z.object({ email: z.string() });",
    py: "class User(BaseModel):\n    email: str",
  },
];

// Illustrative streak for the example record: 1 = trained that day
const EXAMPLE_STREAK = [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const [modules, lessonCount, achievements, achievementCount] = await Promise.all([
    prisma.module.findMany({
      orderBy: { order: "asc" },
      select: { id: true, order: true, title: true, duration: true, _count: { select: { lessons: true } } },
    }),
    prisma.lesson.count(),
    prisma.achievement.findMany({
      where: { tier: { in: ["Bronze", "Silver", "Gold"] } },
      orderBy: { xpReward: "asc" },
      select: { name: true, description: true },
      take: 3,
    }),
    prisma.achievement.count(),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="flex-1">
        <Hero moduleCount={modules.length} lessonCount={lessonCount} />

        {/* ── Syllabus ───────────────────────────────────────────────── */}
        <section
          id="syllabus"
          aria-labelledby="syllabus-heading"
          className="scroll-mt-16 border-t border-border bg-sheet px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
              <h2
                id="syllabus-heading"
                className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em] sm:text-6xl"
              >
                The syllabus
              </h2>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground lg:pt-2">
                Each belt is a set of modules. Pass a module&apos;s grading and a stripe goes on
                your belt. Fill the belt and you&apos;re promoted. Sixteen modules take you from 16
                kyu to black belt.
              </p>
            </div>

            <div className="mt-14 flex flex-col">
              {BELTS.map((belt) => {
                const beltModules = modules.filter((m) => beltForModule(m.order).key === belt.key);
                const span = belt.toModule - belt.fromModule + 1;
                return (
                  <article
                    key={belt.key}
                    className="grid gap-6 border-t border-border py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-12"
                    aria-labelledby={`belt-${belt.key}`}
                  >
                    <div className="flex flex-col gap-3">
                      <BeltBand belt={belt.key} slots={span} filled={0} />
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 id={`belt-${belt.key}`} className="font-condensed text-2xl font-bold">
                          {belt.label}
                        </h3>
                        <span className="font-condensed tabular text-sm text-muted-foreground">
                          {kyuRange(belt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{belt.summary}</p>
                    </div>
                    <ol className="flex flex-col">
                      {beltModules.map((m) => (
                        <li
                          key={m.id}
                          className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border/70 py-3 last:border-b-0"
                        >
                          <span className="font-condensed tabular text-sm text-muted-foreground">
                            {String(m.order).padStart(2, "0")}
                          </span>
                          <span className="font-medium">{m.title}</span>
                          <span className="font-condensed tabular text-sm whitespace-nowrap text-muted-foreground">
                            {m._count.lessons} lessons · ~{m.duration} h
                          </span>
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              })}

              {/* Black belt */}
              <article
                className="grid gap-6 border-t border-border py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-12"
                aria-labelledby="belt-black"
              >
                <div className="flex flex-col gap-3">
                  <BeltBand belt="black" />
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 id="belt-black" className="font-condensed text-2xl font-bold">
                      Black belt
                    </h3>
                    <span className="font-condensed text-sm text-muted-foreground">1st dan</span>
                  </div>
                </div>
                <p className="max-w-2xl self-center text-lg leading-relaxed">
                  Every Python grading passed, plus three capstone projects that pass their
                  acceptance tests. At this point you can build and ship real Python, not just
                  read it.
                </p>
              </article>

              {/* AI automation dan ranks */}
              <article
                className="grid gap-6 border-t border-border py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-12"
                aria-labelledby="belt-dan"
              >
                <div className="flex flex-col gap-3">
                  <h3 id="belt-dan" className="font-condensed text-2xl font-bold">
                    AI automation
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Dan ranks for black belts. In preparation, and not yet open.
                  </p>
                </div>
                <ol className="grid gap-x-10 sm:grid-cols-2">
                  {DAN_TRACK.map((d) => (
                    <li
                      key={d.dan}
                      className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-baseline gap-x-3 border-b border-border/70 py-3"
                    >
                      <span className="font-condensed tabular text-sm text-muted-foreground">
                        {ordinal(d.dan)} dan
                      </span>
                      <span className="text-muted-foreground">{d.title}</span>
                    </li>
                  ))}
                </ol>
              </article>
            </div>
          </div>
        </section>

        {/* ── How rank is earned ─────────────────────────────────────── */}
        <section
          id="rank"
          aria-labelledby="rank-heading"
          className="scroll-mt-16 border-t border-border px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <h2
              id="rank-heading"
              className="font-condensed max-w-3xl text-5xl leading-none font-extrabold tracking-[-0.02em] sm:text-6xl"
            >
              Rank is earned, not clicked.
            </h2>

            <ol className="mt-14 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
              <li className="flex flex-col gap-4 bg-background p-6">
                <h3 className="text-lg font-semibold">Learn the technique</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Short lessons with examples you run in place. Change them, break them, run them
                  again.
                </p>
                <pre className="mt-auto rounded-sm border border-border bg-sheet p-3 font-mono text-[0.8125rem] leading-6">
                  <span className="text-muted-foreground">&gt;&gt;&gt; </span>
                  [n * 2 for n in range(3)]{"\n"}
                  <span className="text-muted-foreground">[0, 2, 4]</span>
                </pre>
              </li>
              <li className="flex flex-col gap-4 bg-background p-6">
                <h3 className="text-lg font-semibold">Drill it</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Graded exercises checked against real tests. Hints are there when you need them.
                  Each one costs a little XP.
                </p>
                <div className="mt-auto flex flex-col rounded-sm border border-border bg-sheet font-mono text-[0.8125rem]">
                  {['greet("Ada")', 'greet("Grace Hopper")'].map((t) => (
                    <span
                      key={t}
                      className="flex items-center gap-2 border-b border-border/70 px-3 py-2 last:border-b-0"
                    >
                      <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                      <span className="truncate">{t}</span>
                      <span className="ml-auto text-muted-foreground">passed</span>
                    </span>
                  ))}
                </div>
              </li>
              <li className="flex flex-col gap-4 bg-background p-6">
                <h3 className="text-lg font-semibold">Pass the grading</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Every module ends with a grading: no hints, no solutions, 80% to pass. Pass it and
                  the seal goes on your record.
                </p>
                <div className="mt-auto flex h-[5.25rem] items-center justify-center rounded-sm border border-border bg-sheet">
                  <Seal label="Passed" detail="Module grading" />
                </div>
              </li>
              <li className="flex flex-col gap-4 bg-background p-6">
                <h3 className="text-lg font-semibold">Keep it sharp</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Skills you haven&apos;t used in a while fade. A short daily review brings them back
                  before they&apos;re gone.
                </p>
                <div className="mt-auto flex flex-col gap-2 rounded-sm border border-border bg-sheet p-3">
                  <BeltBand belt="green" slots={3} filled={3} faded={1} />
                  <span className="text-xs text-muted-foreground">
                    Third stripe fading: decorators are due for review
                  </span>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ── JS bridge ──────────────────────────────────────────────── */}
        <section
          id="bridge"
          aria-labelledby="bridge-heading"
          className="scroll-mt-16 border-t border-border bg-sheet px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
        >
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
            <div className="flex flex-col gap-5">
              <h2
                id="bridge-heading"
                className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em] sm:text-6xl"
              >
                You already know half of this.
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                If you write JavaScript or TypeScript, lessons put the Python right next to the code
                you already use, so you learn the differences instead of starting over.
              </p>
            </div>

            <div className="overflow-hidden rounded-md border border-border bg-background">
              <div className="grid grid-cols-2 border-b border-border text-sm font-semibold">
                <span className="px-4 py-2.5">JavaScript</span>
                <span className="border-l border-border px-4 py-2.5">Python</span>
              </div>
              {BRIDGE.map((row) => (
                <div key={row.concept} className="border-b border-border last:border-b-0">
                  <p className="px-4 pt-3 text-xs text-muted-foreground">{row.concept}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <pre
                      className="hljs overflow-x-auto px-4 pt-1.5 pb-3 font-mono text-[0.8125rem] leading-6"
                      dangerouslySetInnerHTML={{ __html: highlight(row.js, "javascript") }}
                    />
                    <pre
                      className="hljs overflow-x-auto px-4 pt-1.5 pb-3 font-mono text-[0.8125rem] leading-6 sm:border-l sm:border-border"
                      dangerouslySetInnerHTML={{ __html: highlight(row.py, "python") }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Training record ───────────────────────────────────────── */}
        <section
          aria-labelledby="record-heading"
          className="border-t border-border px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-5">
              <h2
                id="record-heading"
                className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em] sm:text-6xl"
              >
                Every session goes on your record.
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Daily streaks, XP, levels and {achievementCount} achievements keep you training.
                Rank is the one thing you can&apos;t grind: it only moves when you pass a grading.
              </p>
            </div>

            <figure className="rounded-md border border-border bg-sheet">
              <div className="flex items-end justify-between gap-6 border-b border-border p-6">
                <div className="flex items-end gap-3">
                  <span className="font-condensed tabular text-[5.5rem] leading-[0.8] font-extrabold tracking-[-0.03em]">
                    9
                  </span>
                  <span className="font-condensed pb-1 text-2xl font-bold">kyu</span>
                </div>
                <div className="flex w-40 flex-col gap-2 pb-1">
                  <BeltBand belt="green" slots={3} filled={1} />
                  <span className="text-xs text-muted-foreground">Green belt · 1 of 3 stripes</span>
                </div>
              </div>
              <div className="grid gap-6 p-6 sm:grid-cols-2">
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-semibold">
                    18-day streak <span className="font-normal text-muted-foreground">· last 21 days</span>
                  </span>
                  <div className="grid w-fit grid-cols-7 gap-1" aria-hidden="true">
                    {EXAMPLE_STREAK.map((day, i) => (
                      <span
                        key={i}
                        className={
                          day
                            ? "size-4 rounded-[2px] bg-primary/70"
                            : "size-4 rounded-[2px] border border-border bg-transparent"
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-semibold">Recent achievements</span>
                  <ul className="flex flex-col gap-2">
                    {achievements.map((a) => (
                      <li key={a.name} className="flex flex-col">
                        <span className="text-sm font-medium">{a.name}</span>
                        <span className="text-xs text-muted-foreground">{a.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <figcaption className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
                Example record. Yours starts at 16 kyu, white belt.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── Close ─────────────────────────────────────────────────── */}
        <section
          aria-labelledby="close-heading"
          className="border-t border-border bg-sheet px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-8">
            <h2
              id="close-heading"
              className="font-condensed text-[clamp(3rem,8vw,6rem)] leading-[0.92] font-extrabold tracking-[-0.025em]"
            >
              Tie on the white belt.
            </h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button size="lg" asChild>
                <Link href="/auth/signup">
                  Create your account
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
              <Link
                href="/auth/signin"
                className="text-sm font-semibold underline decoration-foreground/30 hover:decoration-foreground"
              >
                I already have one
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
