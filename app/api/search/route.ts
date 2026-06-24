import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { canCompleteLesson, getSequentialModuleUnlockMap } from "@/lib/module-access";

export interface SearchResult {
  id: string;
  type: "module" | "lesson" | "exercise";
  title: string;
  description: string;
  href: string;
  moduleTitle?: string;
  isLocked?: boolean;
  lockLabel?: string;
}

export const GET = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ results: [] });

    const lower = q.toLowerCase();

    const [modules, lessons, exercises] = await Promise.all([
      prisma.module.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          prerequisites: {
            select: {
              id: true,
              title: true,
              order: true,
            },
          },
        },
        take: 5,
      }),
      prisma.lesson.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          module: {
            select: {
              id: true,
              title: true,
              prerequisites: {
                select: {
                  id: true,
                  title: true,
                  order: true,
                },
              },
            },
          },
        },
        take: 5,
      }),
      prisma.exercise.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          lesson: {
            select: {
              id: true,
              title: true,
              order: true,
              module: {
                select: {
                  id: true,
                  title: true,
                  prerequisites: {
                    select: {
                      id: true,
                      title: true,
                      order: true,
                    },
                  },
                },
              },
            },
          },
        },
        take: 5,
      }),
    ]);

    const results: SearchResult[] = [
      ...modules.map((m) => ({
        id: m.id,
        type: "module" as const,
        title: m.title,
        description: m.description.slice(0, 100),
        href: "/modules/" + m.id,
        isLocked: false,
      })),
      ...lessons.map((l) => ({
        id: l.id,
        type: "lesson" as const,
        title: l.title,
        description: l.description.slice(0, 100),
        href: "/lessons/" + l.id,
        moduleTitle: l.module.title,
      })),
      ...exercises.map((e) => ({
        id: e.id,
        type: "exercise" as const,
        title: e.title,
        description: e.description.slice(0, 100),
        href: "/exercises/" + e.id,
        moduleTitle: e.lesson.module.title,
      })),
    ];

    const moduleUnlockMap = await getSequentialModuleUnlockMap(context.userId);

    const moduleStatuses = await Promise.all(
      modules.map(async (module) => {
        return {
          id: module.id,
          isLocked: !(moduleUnlockMap.get(module.id) ?? false),
          lockLabel:
            !(moduleUnlockMap.get(module.id) ?? false) && module.order > 1
              ? "Locked until the previous module is complete"
              : undefined,
        };
      })
    );

    const lessonStatuses = await Promise.all(
      lessons.map(async (lesson) => {
        const moduleUnlocked = moduleUnlockMap.get(lesson.module.id) ?? false;
        const siblingLessons = await prisma.lesson.findMany({
          where: { moduleId: lesson.module.id },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            progress: {
              where: { userId: context.userId },
              select: { completed: true },
            },
          },
        });
        const lessonUnlocked = canCompleteLesson(
          siblingLessons.map((item) => ({
            id: item.id,
            title: item.title,
            order: item.order,
            completed: item.progress[0]?.completed || false,
          })),
          lesson.id,
          moduleUnlocked
        );
        return {
          id: lesson.id,
          isLocked: !lessonUnlocked,
          lockLabel: !lessonUnlocked
            ? lesson.order === 1 && !moduleUnlocked
              ? "Locked until the previous module is complete"
              : "Locked until previous lessons are complete"
            : undefined,
        };
      })
    );

    const exerciseStatuses = await Promise.all(
      exercises.map(async (exercise) => {
        const moduleUnlocked = moduleUnlockMap.get(exercise.lesson.module.id) ?? false;
        const siblingLessons = await prisma.lesson.findMany({
          where: { moduleId: exercise.lesson.module.id },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            progress: {
              where: { userId: context.userId },
              select: { completed: true },
            },
          },
        });
        const lessonUnlocked = canCompleteLesson(
          siblingLessons.map((item) => ({
            id: item.id,
            title: item.title,
            order: item.order,
            completed: item.progress[0]?.completed || false,
          })),
          exercise.lesson.id,
          moduleUnlocked
        );
        return {
          id: exercise.id,
          isLocked: !lessonUnlocked,
          lockLabel: !lessonUnlocked
            ? exercise.lesson.order === 1 && !moduleUnlocked
              ? "Locked until the previous module is complete"
              : "Locked until previous lessons are complete"
            : undefined,
        };
      })
    );

    const moduleStatusMap = new Map(moduleStatuses.map((status) => [status.id, status]));
    const lessonStatusMap = new Map(lessonStatuses.map((status) => [status.id, status]));
    const exerciseStatusMap = new Map(exerciseStatuses.map((status) => [status.id, status]));

    const enrichedResults = results.map((result) => {
      if (result.type === "module") {
        const status = moduleStatusMap.get(result.id);
        return { ...result, ...status };
      }
      if (result.type === "lesson") {
        const status = lessonStatusMap.get(result.id);
        return { ...result, ...status };
      }
      if (result.type === "exercise") {
        const status = exerciseStatusMap.get(result.id);
        return { ...result, ...status };
      }
      return result;
    });

    // Simple relevance: exact title match comes first
    enrichedResults.sort((a, b) => {
      const aExact =
        a.title.toLowerCase() === lower ? 0 : a.title.toLowerCase().startsWith(lower) ? 1 : 2;
      const bExact =
        b.title.toLowerCase() === lower ? 0 : b.title.toLowerCase().startsWith(lower) ? 1 : 2;
      return aExact - bExact;
    });

    return NextResponse.json({ results: enrichedResults.slice(0, 12) });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
});
