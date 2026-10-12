import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getLessonForUser } from "@/lib/lessons";
import { completeLesson } from "@/lib/lesson-complete";
import { z } from "zod";

const lessonProgressSchema = z.object({
  lessonId: z.string().min(1, "Lesson ID is required"),
  completed: z.boolean(),
});

/**
 * POST /api/progress/lesson
 * Mark a lesson as complete: lessons with no required drills, and lessons whose drills were all
 * passed before passing them completed the lesson by itself (the drill submit route does that now).
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const body = await req.json();
    const validation = lessonProgressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { lessonId, completed } = validation.data;

    // Same rules as the lesson page: in sequence, and every required drill passed
    const lesson = await getLessonForUser(lessonId, context.userId);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    if (!completed) {
      return NextResponse.json(
        { error: "Completed lessons are read-only for review and cannot be marked incomplete." },
        { status: 403 }
      );
    }
    if (!lesson.completed && !lesson.canComplete) {
      const error = !lesson.moduleUnlocked
        ? "Pass the earlier modules before completing lessons in this one."
        : !lesson.inSequence
          ? "Finish the earlier lessons in this module first."
          : `Pass the ${lesson.requiredRemaining} required ${lesson.requiredRemaining === 1 ? "drill" : "drills"} in this lesson first.`;
      return NextResponse.json({ error, requiredRemaining: lesson.requiredRemaining }, { status: 403 });
    }

    const userBefore = await prisma.user.findUnique({ where: { id: context.userId }, select: { level: true } });
    const oldLevel = userBefore?.level ?? 1;
    // Completing twice changes nothing and earns nothing
    const done = await completeLesson(context.userId, lessonId);
    const userAfter = await prisma.user.findUnique({ where: { id: context.userId }, select: { level: true } });
    const newLevel = userAfter?.level ?? oldLevel;

    return NextResponse.json({
      success: true,
      xpGained: done.xpGained,
      achievements: done.achievements,
      levelUp: newLevel > oldLevel,
      newLevel,
      milestone: done.milestone,
    });
  } catch (error) {
    console.error("Error updating lesson progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
});
