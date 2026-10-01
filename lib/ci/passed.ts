import { prisma } from "@/lib/prisma";

/**
 * Projects whose acceptance tests a learner has passed in GitHub Actions. Kept
 * apart from lib/ci/links.ts so rank and achievements can use it without
 * importing the lab and grading code.
 */
export async function ciPassedProjectIds(userId: string): Promise<string[]> {
  const links = await prisma.ciLink.findMany({ where: { userId, kind: "capstone", status: "passed" }, select: { targetId: true } });
  return links.map((l) => l.targetId);
}
