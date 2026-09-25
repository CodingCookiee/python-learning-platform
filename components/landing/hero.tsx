"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeltLadder } from "@/components/brand/belt";
import { LiveDrill } from "@/components/landing/live-drill";

export function Hero({ moduleCount, lessonCount }: { moduleCount: number; lessonCount: number }) {
  const [stripes, setStripes] = React.useState(0);

  return (
    <section aria-labelledby="hero-heading" className="px-4 pt-10 pb-12 sm:px-6 lg:px-8 lg:pt-16">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-7 lg:pt-6">
          <h1
            id="hero-heading"
            className="font-condensed text-[clamp(3rem,7.2vw,6rem)] leading-[0.92] font-extrabold tracking-[-0.025em]"
          >
            Earn your black belt in Python.
          </h1>
          <p className="max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
            A graded path for developers, from first syntax to advanced Python, then on to AI
            automation. You don&apos;t move up by clicking &ldquo;next&rdquo;. You move up by
            passing drills and gradings, right here in the browser.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button size="lg" asChild>
              <Link href="/auth/signup">
                Start at white belt
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Link
              href="#syllabus"
              className="text-sm font-semibold underline decoration-foreground/30 hover:decoration-foreground"
            >
              Read the syllabus
            </Link>
          </div>
          <p className="font-condensed tabular text-sm text-muted-foreground">
            {moduleCount} modules · {lessonCount} lessons · no install, Python runs in your browser
          </p>
        </div>

        <LiveDrill onPass={() => setStripes(1)} />
      </div>

      <div className="mx-auto mt-14 max-w-7xl lg:mt-20">
        <BeltLadder
          currentBelt="white"
          stripes={stripes}
          fresh={stripes ? 0 : undefined}
          earnedLabel="Stripe earned"
        />
      </div>
    </section>
  );
}
