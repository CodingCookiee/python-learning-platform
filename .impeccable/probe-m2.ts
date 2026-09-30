import "dotenv/config";
import { prisma } from "../lib/prisma";
async function main() {
  const [progress, subs, users] = await Promise.all([
    prisma.progress.count({ where: { completed: true } }),
    prisma.exerciseSubmission.count(),
    prisma.user.count(),
  ]);
  console.log({ progress, subs, users });
  const ex = await prisma.exercise.findMany({ where: { archivedAt: null }, select: { tags: true, difficulty: true, type: true, required: true } });
  const diff: Record<string, number> = {}; const type: Record<string, number> = {}; const tags: Record<string, number> = {};
  for (const e of ex) { diff[e.difficulty] = (diff[e.difficulty] ?? 0) + 1; type[e.type] = (type[e.type] ?? 0) + 1; for (const t of e.tags) tags[t] = (tags[t] ?? 0) + 1; }
  console.log(diff, type, "distinct tags", Object.keys(tags).length);
  console.log(Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([t, n]) => `${t}:${n}`).join(" "));
  const counts = Object.values(tags); console.log("tags used once", counts.filter((c) => c === 1).length);
}
main().finally(() => process.exit(0));
