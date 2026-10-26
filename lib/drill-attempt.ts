import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Store a drill attempt and say whether it's the learner's first pass of the drill, the one that
 * earns its XP and a place in the review deck. That's settled under a lock for this learner and
 * drill, so two tabs (or devices) passing it at the same moment can't both count as first.
 */
export async function recordDrillAttempt(data: Prisma.ExerciseSubmissionUncheckedCreateInput) {
  const { userId, exerciseId } = data;
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`drill-pass:${userId}:${exerciseId}`}))) AS locked`;
      const passedBefore = await tx.exerciseSubmission.findFirst({
        where: { userId, exerciseId, passed: true },
        select: { id: true },
      });
      const submission = await tx.exerciseSubmission.create({ data });
      return { submission, firstPass: Boolean(data.passed) && !passedBefore };
    },
    // The remote database is slow; a short wait for the lock is fine
    { maxWait: 10_000, timeout: 20_000 }
  );
}
