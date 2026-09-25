import { prisma } from "@/lib/prisma";
import { getModuleDisplayDuration } from "@/lib/module-duration";

export type ModuleState = "passed" | "current" | "open" | "locked";

export interface SyllabusModule {
  id: string;
  order: number;
  title: string;
  description: string;
  duration: number;
  lessonsTotal: number;
  lessonsDone: number;
  projectsTotal: number;
  state: ModuleState;
}

/**
 * Every module with the learner's progress, in syllabus order.
 *
 * Unlocking is sequential, matching the lesson-progress API: a module opens
 * once every earlier module is passed. "current" is the first module not yet
 * passed, the one that earns the next stripe.
 */
export async function getSyllabusProgress(userId: string): Promise<SyllabusModule[]> {
  const [modules, completed] = await Promise.all([
    prisma.module.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        title: true,
        description: true,
        duration: true,
        lessons: { select: { id: true } },
        _count: { select: { projects: true } },
      },
    }),
    prisma.progress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true },
    }),
  ]);

  const done = new Set(completed.map((p) => p.lessonId));
  let priorPassed = true;
  let currentAssigned = false;

  return modules.map((m) => {
    const lessonsDone = m.lessons.filter((l) => done.has(l.id)).length;
    const passed = m.lessons.length === 0 || lessonsDone === m.lessons.length;

    let state: ModuleState;
    if (!priorPassed) state = "locked";
    else if (passed) state = "passed";
    else if (!currentAssigned) {
      state = "current";
      currentAssigned = true;
    } else state = "open";

    priorPassed = priorPassed && passed;

    return {
      id: m.id,
      order: m.order,
      title: m.title,
      description: m.description,
      duration: getModuleDisplayDuration(m.title, m.duration),
      lessonsTotal: m.lessons.length,
      lessonsDone,
      projectsTotal: m._count.projects,
      state,
    };
  });
}
