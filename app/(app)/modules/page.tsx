import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { RankCard } from "@/components/brand/rank-card";
import { SyllabusProgress } from "@/components/brand/syllabus-progress";
import { getLearnerRank } from "@/lib/learner-rank";
import { getSyllabusProgress } from "@/lib/syllabus";
import { DAN_TRACK, ordinal } from "@/lib/ranks";

export default async function ModulesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const [rank, modules] = await Promise.all([getLearnerRank(userId), getSyllabusProgress(userId)]);
  const passed = modules.filter((m) => m.state === "passed").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-10">
        <FadeIn>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Syllabus" }]} />
        </FadeIn>

        <FadeIn delay={0.03}>
          <header className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em] sm:text-6xl">
                The syllabus
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                Sixteen modules from white belt to black belt. Each module you pass puts a stripe on
                your belt; modules open in order.
              </p>
            </div>
            <p className="font-condensed tabular leading-none">
              <span className="text-6xl font-extrabold tracking-[-0.03em]">{passed}</span>
              <span className="ml-1 text-2xl font-bold text-muted-foreground">
                / {modules.length} passed
              </span>
            </p>
          </header>
        </FadeIn>

        <FadeIn delay={0.06}>
          <RankCard rank={rank} showLadder={false} />
        </FadeIn>

        <FadeIn delay={0.09}>
          <SyllabusProgress modules={modules} />
        </FadeIn>

        <FadeIn delay={0.12}>
          <section
            aria-labelledby="dan-heading"
            className="grid gap-5 border-t border-border py-7 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10"
          >
            <div className="flex flex-col gap-2">
              <h2 id="dan-heading" className="font-condensed text-xl font-bold">
                AI automation
              </h2>
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
          </section>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
