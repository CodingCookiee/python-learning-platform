import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

/**
 * GET /api/exercises/[id]
 * Get exercise details
 */
export const GET = withAuth(
  async (req: NextRequest, context: { userId: string; params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      const exercise = await prisma.exercise.findUnique({
        where: { id },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              moduleId: true,
            },
          },
          submissions: {
            where: { userId: context.userId },
            orderBy: { submittedAt: "desc" },
            take: 5, // Last 5 submissions
          },
        },
      });

      if (!exercise) {
        return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
      }

      // Don't return solution unless user has solved it
      const hasSolved = exercise.submissions.some((s) => s.passed);
      const attemptsCount = exercise.submissions.length;

      const response = {
        id: exercise.id,
        title: exercise.title,
        description: exercise.description,
        instructions: exercise.instructions,
        starterCode: exercise.starterCode,
        testCases: JSON.parse(exercise.testCases),
        hints: JSON.parse(exercise.hints),
        difficulty: exercise.difficulty,
        xpReward: exercise.xpReward,
        lesson: exercise.lesson,
        // Only include solution if solved or after 3+ attempts
        solution: hasSolved || attemptsCount >= 3 ? exercise.solution : null,
        submissions: exercise.submissions.map((s) => ({
          id: s.id,
          passed: s.passed,
          attempts: s.attempts,
          hintsUsed: s.hintsUsed,
          submittedAt: s.submittedAt,
        })),
        stats: {
          attempts: attemptsCount,
          solved: hasSolved,
          hintsAvailable: JSON.parse(exercise.hints).length,
        },
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error fetching exercise:", error);
      return NextResponse.json({ error: "Failed to fetch exercise" }, { status: 500 });
    }
  }
);
