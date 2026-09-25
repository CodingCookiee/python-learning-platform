import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDrillForUser } from "@/lib/drills";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn } from "@/components/animations";
import { ExerciseClient } from "./_components/exercise-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExercisePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!user) redirect("/auth/signin");

  const drill = await getDrillForUser(id, user.id);
  if (!drill) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Syllabus", href: "/modules" },
              { label: drill.module.title, href: `/modules/${drill.module.id}` },
              { label: drill.lesson.title, href: `/lessons/${drill.lesson.id}` },
              { label: drill.title },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <ExerciseClient key={drill.id} drill={drill} />
        </FadeIn>
      </div>
    </div>
  );
}
