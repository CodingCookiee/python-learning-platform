import { prisma } from "@/lib/prisma";

/** A throwaway learner, unique per run, removed by cleanup() (everything they own cascades) */
export async function makeLearner(label: string, data: Record<string, unknown> = {}) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
  const user = await prisma.user.create({ data: { email, name: label, emailVerified: new Date(), ...data } });
  return {
    user,
    cleanup: () => prisma.user.deleteMany({ where: { id: user.id } }),
  };
}

/** Pass every Python module's checkpoint as a placement test */
export async function passAllPython(userId: string) {
  const modules = await prisma.module.findMany({
    where: { archivedAt: null, track: { slug: "python" } },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  await prisma.checkpointAttempt.createMany({
    data: modules.map((m) => ({
      userId,
      moduleId: m.id,
      exerciseIds: [],
      passedIds: [],
      placement: true,
      score: 1,
      passed: true,
      submittedAt: new Date(),
    })),
  });
  return modules;
}
