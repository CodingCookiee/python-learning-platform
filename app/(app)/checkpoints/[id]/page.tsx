import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Check, Circle, X } from "lucide-react";
import { auth } from "@/auth";
import { getCheckpointAttempt, getCheckpointSummary } from "@/lib/checkpoint";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn } from "@/components/animations";
import { Button } from "@/components/ui/button";
import { Seal } from "@/components/brand/seal";
import { CheckpointClock, HandInButton, StartCheckpointButton } from "@/components/mastery/checkpoint-controls";
import { CHECKPOINT_RETRY_MINUTES } from "@/lib/mastery-rules";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const TYPE_LABEL: Record<string, string> = {
  function: "Write the code",
  program: "Write a program",
  predict: "Predict the output",
  fix: "Fix the bug",
  refactor: "Refactor",
  tests: "Write the tests",
};

export default async function CheckpointPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const { id } = await params;
  const attempt = await getCheckpointAttempt(userId, id);
  if (!attempt) notFound();

  const open = attempt.submittedAt === null;
  const passedCount = attempt.drills.filter((d) => d.passed).length;
  const total = attempt.drills.length;
  const needed = Math.ceil(attempt.passMark * total - 1e-9);
  const summary = open ? null : await getCheckpointSummary(userId, attempt.module.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Syllabus", href: "/modules" },
              { label: attempt.module.title, href: `/modules/${attempt.module.id}` },
              { label: "Checkpoint" },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.03}>
          <header className="flex flex-col gap-4 border-b border-border pb-8">
            <p className="text-sm font-semibold text-primary">
              {attempt.placement ? "Placement checkpoint" : "Module checkpoint"}
            </p>
            <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em]">
              {attempt.module.title}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {open
                ? `Pass ${needed} of these ${total} drills to pass the module. Each starts from its blank starter, with no hints and no reference solution. Run the tests as often as you like.`
                : attempt.passed
                  ? attempt.placement
                    ? "You tested out of this module. Its lessons stay open whenever you want them."
                    : "Module passed. The next one is open."
                  : `You needed ${needed} of ${total}. Look at the drills you missed, then try a fresh set.`}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="font-condensed tabular leading-none">
                <span className="text-5xl font-extrabold tracking-[-0.03em]">{passedCount}</span>
                <span className="text-xl font-bold text-muted-foreground"> / {total} passed</span>
              </p>
              {open ? (
                <>
                  <CheckpointClock deadline={attempt.deadline} className="text-lg" />
                  <span className="ml-auto">
                    <HandInButton attemptId={attempt.id} allPassed={passedCount === total} />
                  </span>
                </>
              ) : (
                <span className="font-condensed tabular text-lg text-muted-foreground">
                  {Math.round((attempt.score ?? 0) * 100)}%
                </span>
              )}
              {!open && attempt.passed && <Seal label="Passed" detail="Checkpoint" className="ml-auto" />}
            </div>
          </header>
        </FadeIn>

        <FadeIn delay={0.06}>
          <ol className="flex flex-col border-t border-border">
            {attempt.drills.map((d, i) => {
              const row = (
                <>
                  <span className="font-condensed tabular pt-0.5 text-lg font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-semibold">{d.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {TYPE_LABEL[d.type] ?? d.type} · {d.difficulty} · from {d.lessonTitle}
                    </span>
                  </span>
                  <span className="flex w-5 justify-end self-center">
                    {d.passed ? (
                      <Check className="size-4 text-success" aria-label="Passed" />
                    ) : open ? (
                      <Circle className="size-3.5 text-muted-foreground" aria-label="Not passed yet" />
                    ) : (
                      <X className="size-4 text-destructive" aria-label="Not passed" />
                    )}
                  </span>
                </>
              );
              const rowClass = "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-border py-4";
              return (
                <li key={d.id}>
                  {/* While open the drill page serves checkpoint mode; afterwards it's ordinary practice again */}
                  <Link href={`/exercises/${d.id}`} className={cn(rowClass, "-mx-3 rounded-sm px-3 hover:bg-accent/50")}>
                    {row}
                  </Link>
                </li>
              );
            })}
          </ol>
        </FadeIn>

        <FadeIn delay={0.09}>
          <div className="flex flex-wrap items-center gap-3">
            {open && attempt.drills.find((d) => !d.passed) && (
              <Button asChild>
                <Link href={`/exercises/${attempt.drills.find((d) => !d.passed)!.id}`}>
                  {passedCount === 0 ? "Start the first drill" : "Next unpassed drill"}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            )}
            {!open && !attempt.passed && summary?.status === "cooldown" && (
              <p className="text-sm text-muted-foreground">
                A fresh set of drills is ready {CHECKPOINT_RETRY_MINUTES} minutes after an attempt. Use the time on the
                drills you missed.
              </p>
            )}
            {!open && !attempt.passed && (summary?.status === "ready" || summary?.status === "placement") && (
              <StartCheckpointButton moduleId={attempt.module.id} label="Try a fresh set" />
            )}
            <Button asChild variant="outline">
              <Link href={`/modules/${attempt.module.id}`}>Back to the module</Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
