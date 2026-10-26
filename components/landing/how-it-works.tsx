import { Check } from "lucide-react";
import { BeltBand, DanBand } from "@/components/brand/belt";
import { Seal } from "@/components/brand/seal";

/** Points at the Try it sandbox above, which lets a visitor do this step for real */
function TriedTag() {
  return (
    <span className="w-fit rounded-sm border border-(--keyline)/40 px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
      In the Try it above
    </span>
  );
}

function StopNumber({ n }: { n: number }) {
  return (
    <span className="font-condensed tabular text-sm font-bold text-muted-foreground" aria-hidden="true">
      {String(n).padStart(2, "0")}
    </span>
  );
}

const LATER = [
  {
    title: "Belts",
    text: "Stripes fill a belt, and a full belt promotes you: white, yellow, green, blue, brown. Skills you haven't used in a while fade; a short daily review keeps them.",
    picture: (
      <div className="flex flex-col gap-2">
        <BeltBand belt="green" slots={3} filled={3} faded={1} />
        <span className="text-xs text-muted-foreground">Third stripe fading: decorators are due for review</span>
      </div>
    ),
  },
  {
    title: "Capstones",
    text: "Real projects you build on your own computer and push to GitHub, where tests check them.",
    picture: (
      <div className="flex flex-col rounded-sm border border-border bg-background font-mono text-[0.8125rem]">
        {["receipt prints a total", "bad lines are skipped"].map((t) => (
          <span key={t} className="flex items-center gap-2 border-b border-border/70 px-3 py-1.5 last:border-b-0">
            <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
            <span className="truncate">{t}</span>
          </span>
        ))}
      </div>
    ),
  },
  {
    title: "Black belt",
    text: "All 16 gradings passed, the advanced topics kept strong through review, and three capstones approved. Rank can't be ground out with XP: it only moves when you pass.",
    picture: (
      <div className="flex flex-col gap-2">
        <BeltBand belt="black" barPosition="none" />
        <span className="text-xs text-muted-foreground">1st dan</span>
      </div>
    ),
  },
  {
    title: "AI automation",
    text: "Eight more modules after the black belt, the dan grades: LLM APIs, agents, RAG, MCP, n8n and running it all in production.",
    picture: (
      <div className="flex flex-col gap-2">
        <DanBand />
        <span className="text-xs text-muted-foreground">2nd to 9th dan</span>
      </div>
    ),
  },
] as const;

/**
 * The landing page's "How it works": the whole path in seven stops, the first three being what the
 * "Try it" sandbox above just did. Replaces the old "Rank is earned, not clicked." section, whose
 * pictures it keeps.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-16 border-t border-border bg-sheet px-gutter py-20 lg:py-28"
    >
      <div className="mx-auto max-w-page">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2 id="how-heading" className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em] sm:text-6xl">
            How it works
          </h2>
          <p className="font-condensed text-2xl font-bold">Rank is earned, not clicked.</p>
          <p className="text-lg leading-relaxed text-muted-foreground">
            The Try it above is the first three steps. Here&apos;s the whole path.
          </p>
        </div>

        {/* Two lists, one path: the second carries on from 4 */}
        <div className="mt-14 flex flex-col gap-14">
          {/* The first three run along one belt; the grading is where the stripe goes on */}
          <div>
            <BeltBand belt="white" slots={4} filled={1} className="hidden h-4 lg:flex" />
            {/* The same four columns as the row below, so the two lines up: Lessons and Drills take one
                each, the grading (where the stripe goes on) the last two */}
            <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
              <li className="flex flex-col gap-4 lg:border-l lg:border-(--keyline)/40 lg:pt-7 lg:pr-8 lg:pl-5">
                <StopNumber n={1} />
                <h3 className="text-lg font-semibold">Lessons</h3>
                <TriedTag />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Short reads with examples you run in place. Never coded? Start with a 4-hour on-ramp in plain
                  language.
                </p>
                <pre className="mt-auto rounded-sm border border-border bg-background p-3 font-mono text-[0.8125rem] leading-6">
                  <span className="text-muted-foreground">&gt;&gt;&gt; </span>
                  [n * 2 for n in range(3)]{"\n"}
                  <span className="text-muted-foreground">[0, 2, 4]</span>
                </pre>
              </li>
              <li className="flex flex-col gap-4 lg:border-l lg:border-(--keyline)/40 lg:pt-7 lg:pr-8 lg:pl-5">
                <StopNumber n={2} />
                <h3 className="text-lg font-semibold">Drills</h3>
                <TriedTag />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Exercises checked by real tests. Hints are there when you&apos;re stuck; the optional AI tutor asks
                  questions rather than giving you answers.
                </p>
                <div className="mt-auto flex flex-col rounded-sm border border-border bg-background font-mono text-[0.8125rem]">
                  {['greet("Ada")', 'greet("Linus")'].map((t) => (
                    <span key={t} className="flex items-center gap-2 border-b border-border/70 px-3 py-2 last:border-b-0">
                      <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                      <span className="truncate">{t}</span>
                      <span className="ml-auto text-muted-foreground">passed</span>
                    </span>
                  ))}
                </div>
              </li>
              {/* Marked by its panel and seal, in the same type and spacing as every other step */}
              <li className="grid gap-4 rounded-md bg-accent/70 p-5 sm:col-span-2 lg:mt-3 lg:ml-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-8 lg:rounded-t-none lg:px-5 lg:pt-4 lg:pb-5">
                <div className="flex flex-col gap-4">
                  <StopNumber n={3} />
                  <h3 className="text-lg font-semibold">Gradings</h3>
                  <TriedTag />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Every module ends with one: no hints, 80% to pass. Pass it and a stripe goes on your belt. Already
                    know the topic? Take the grading first and test out.
                  </p>
                </div>
                <div className="flex items-center justify-center py-2 lg:self-center">
                  <Seal label="Passed" detail="Module grading" />
                </div>
              </li>
            </ol>
          </div>

          <ol start={4} className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
            {LATER.map((stop, i) => (
              <li key={stop.title} className="flex flex-col gap-4 lg:border-l lg:border-(--keyline)/40 lg:pr-8 lg:pl-5">
                <StopNumber n={i + 4} />
                <h3 className="text-lg font-semibold">{stop.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{stop.text}</p>
                <div className="mt-auto">{stop.picture}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
