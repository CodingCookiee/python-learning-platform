import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { ModulesClient, type ModuleData } from "./_components/modules-client";

export default async function ModulesPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user?.email ?? "" },
    select: { id: true },
  });
  if (!dbUser) redirect("/auth/signin");

  const userId = dbUser.id;

  const rawModules = await prisma.module.findMany({
    orderBy: { order: "asc" },
    include: {
      lessons: { select: { id: true, title: true, order: true }, orderBy: { order: "asc" } },
      projects: { select: { id: true, title: true } },
      prerequisites: { select: { id: true, title: true, order: true } },
      _count: { select: { lessons: true, projects: true } },
    },
  });

  const modules: ModuleData[] = await Promise.all(
    rawModules.map(async (mod) => {
      const lessonIds = mod.lessons.map((l) => l.id);
      const completedCount = await prisma.progress.count({
        where: { userId, lessonId: { in: lessonIds }, completed: true },
      });
      const totalLessons = mod._count.lessons;
      const completionPercentage =
        totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      const prereqResults = await Promise.all(
        mod.prerequisites.map(async (prereq) => {
          const pl = await prisma.lesson.findMany({
            where: { moduleId: prereq.id },
            select: { id: true },
          });
          if (pl.length === 0) return true;
          const done = await prisma.progress.count({
            where: { userId, lessonId: { in: pl.map((l) => l.id) }, completed: true },
          });
          return done === pl.length;
        })
      );
      const isUnlocked = mod.prerequisites.length === 0 || prereqResults.every(Boolean);

      return {
        id: mod.id,
        title: mod.title,
        description: mod.description,
        phase: mod.phase,
        order: mod.order,
        duration: mod.duration,
        lessonCount: mod._count.lessons,
        projectCount: mod._count.projects,
        completionPercentage,
        isUnlocked,
        prerequisites: mod.prerequisites,
        lessons: mod.lessons,
        projects: mod.projects,
      };
    })
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Modules" }]} />
        </FadeIn>
        <FadeIn delay={0.05}>
          <div className="flex flex-col gap-1">
            <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Learning
            </p>
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Modules</h1>
            <p className="text-sm text-muted-foreground">
              Work through each module at your own pace.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <ModulesClient modules={modules} />
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
