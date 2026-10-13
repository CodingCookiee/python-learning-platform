import "dotenv/config";
import { prisma } from "@/lib/prisma";
async function main() {
  const rows = await prisma.exercise.findMany({
    where: { archivedAt: null, lesson: { archivedAt: null, module: { order: 1, track: { slug: "python" } } } },
    select: { slug: true, type: true }, orderBy: [{ lesson: { order: "asc" } }, { order: "asc" }],
  });
  const byType = new Map<string, string>();
  for (const r of rows) if (r.slug && !byType.has(r.type)) byType.set(r.type, r.slug);
  console.log(JSON.stringify(Object.fromEntries(byType)));
  await prisma.$disconnect();
}
void main();
