import type { Metadata } from "next";
import { exerciseMetadata } from "@/lib/page-titles";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDrillForUser } from "@/lib/drills";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn } from "@/components/animations";
import { ExerciseClient } from "./_components/exercise-client";

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
  if (!user) redirect("/auth/signin");

  const [drill, aiKeys] = await Promise.all([
    getDrillForUser(id, user.id, query.review ? "review" : "practice"),
    prisma.aiCredential.count({ where: { userId: user.id } }),
  ]);
  if (!drill) notFound();

  const trail =
    drill.mode.kind === "checkpoint"
      ? [{ label: "Checkpoint", href: `/checkpoints/${drill.mode.attemptId}` }]
      : drill.mode.kind === "review"
        ? [{ label: "Review", href: "/review" }]
        : [{ label: drill.lesson.title, href: `/lessons/${drill.lesson.id}` }];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
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
          <ExerciseClient key={`${drill.id}-${drill.mode.kind}`} drill={drill} aiReady={aiKeys > 0} />
        </FadeIn>
      </div>
    </div>
  );
}
