import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Auth utility functions
 */

/**
 * Get current session server-side
 */
export async function getCurrentSession() {
  return await auth();
}

/**
 * Get current user with full profile data
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      streak: true,
      achievements: {
        include: {
          achievement: true,
        },
        orderBy: {
          unlockedAt: "desc",
        },
      },
    },
  });

  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await auth();
  return !!session?.user;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Get user progress summary
 */
export async function getUserProgress(userId: string) {
  const [completedLessons, completedExercises, completedProjects, streak] = await Promise.all([
    prisma.progress.count({
      where: { userId, completed: true },
    }),
    prisma.exerciseSubmission.count({
      where: { userId, passed: true },
    }),
    prisma.projectSubmission.count({
      where: { userId, status: "Approved" },
    }),
    prisma.streak.findUnique({
      where: { userId },
    }),
  ]);

  return {
    completedLessons,
    completedExercises,
    completedProjects,
    currentStreak: streak?.currentStreak || 0,
    longestStreak: streak?.longestStreak || 0,
  };
}
