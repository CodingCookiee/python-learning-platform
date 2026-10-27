import type { Metadata } from "next";
import { exerciseMetadata } from "@/lib/page-titles";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDrillForUser } from "@/lib/drills";
import { getSavedKeys } from "@/lib/ai/credentials";
import { isServerGrading } from "@/lib/grading/server";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn } from "@/components/animations";
import { ExerciseClient } from "./_components/exercise-client";
import { ReadingPause } from "@/components/lesson/reading-pause";
import { readingTooFast } from "@/lib/reading-pace";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return exerciseMetadata(id);
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ review?: string }>;
}

export default async function ExercisePage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  // Signed in as an account that no longer exists: clear the stale session (else a redirect loop)
  if (!user) redirect("/auth/session-ended");

  const [drill, aiKeys] = await Promise.all([
    getDrillForUser(id, user.id, query.review ? "review" : "practice"),
    getSavedKeys(user.id),
  ]);
  if (!drill) notFound();
  // Gradings and reviews are paced by progress already; pausing one midway would cost the learner
  if (drill.mode.kind === "practice") {
    const tooFast = await readingTooFast(user.id, `drill:${drill.id}`);
    if (tooFast) return <ReadingPause retryAfter={tooFast.retryAfter} />;
  }

  const trail =
    drill.mode.kind === "checkpoint"
      ? [{ label: "Grading", href: `/checkpoints/${drill.mode.attemptId}` }]
      : drill.mode.kind === "review"
        ? [{ label: "Review", href: "/review" }]
        : [{ label: drill.lesson.title, href: `/lessons/${drill.lesson.id}` }];

  return (
    <div className="mx-auto max-w-page px-gutter py-8 sm:py-12">
      <div className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Syllabus", href: "/modules" },
              { label: drill.module.title, href: `/modules/${drill.module.id}` },
              ...trail,
              { label: drill.title },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <ExerciseClient key={`${drill.id}-${drill.mode.kind}`} drill={drill} aiKeys={aiKeys} serverGrading={isServerGrading()} />
        </FadeIn>
      </div>
    </div>
  );
}
