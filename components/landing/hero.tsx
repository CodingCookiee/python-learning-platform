"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeltLadder } from "@/components/brand/belt";
import { TryIt } from "@/components/landing/try-it";

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
            From your very first line of code to advanced Python, then AI automation: one graded
            step at a time, in your browser. Free, nothing to install, no experience needed.
          </p>
          {/* Two ways in: "never coded" carries into onboarding's first answer */}
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/auth/signup?start=new">
                I&apos;ve never coded
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/signup">
                I already code
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <p className="font-condensed tabular text-sm text-muted-foreground">
            {moduleCount} modules · {lessonCount} lessons · free · Python runs in your browser
          </p>
        </div>

        <TryIt onPass={() => setStripes(1)} />
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
