/**
 * npm run content:sync [-- --dry-run] [--force] [--modules slug,slug]
 *
 * Copies content/ into the database, matching rows by slug. Idempotent:
 * run it as often as you like. Items removed from content/ are archived
 * (hidden from learners) rather than deleted, so no progress is ever lost.
 * Pre-content legacy rows (no slug) are archived too.
 *
 * Modules with content errors are skipped (their existing rows are left exactly
 * as they are), so finished modules can ship while others are still being
 * written. Errors outside any module (achievements, tracks) stop the sync unless
 * --force.
 */

import dotenv from "dotenv";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../lib/generated/prisma/client";
import { loadContent } from "../../lib/content/load";
import { beltForModule, ordinal } from "../../lib/ranks";
import type { ContentExercise } from "../../lib/content/schema";

dotenv.config({ quiet: true });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
// --modules a,b,c publishes just those modules; every other module is left exactly as it is
const onlyModules = args.includes("--modules")
  ? new Set(args[args.indexOf("--modules") + 1]!.split(",").map((m) => m.trim()).filter(Boolean))
  : null;

/** Test names and visibility, parsed from a plp tests.py, for the pre-run test list */
export function parseTestNames(tests: string): Array<{ name: string; hidden: boolean }> {
  const out: Array<{ name: string; hidden: boolean }> = [];
  const lines = tests.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = /^@(test|hidden)(?:\(\s*(?:(["'])(.*?)\2)?\s*\))?\s*$/.exec(lines[i]!.trim());
    if (!m) continue;
    let name = m[3];
    if (!name) {
      const def = lines.slice(i + 1).find((l) => /^\s*(async\s+)?def\s/.test(l));
      const fn = def ? /def\s+(\w+)/.exec(def)?.[1] ?? "" : "";
      name = fn.replace(/^_+|_+$/g, "").replace(/_/g, " ") || `Test ${out.length + 1}`;
    }
    out.push({ name, hidden: m[1] === "hidden" });
  }
  return out;
}

/** First paragraph of a markdown prompt, as plain text, for list views */
function firstParagraph(md: string): string {
  const para = md.trim().split(/\n\s*\n/)[0] ?? "";
  return para
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

/** A stable, negative sort key for archived rows so they never block live orders */
function parkedOrder(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return -1_000_000 - (Math.abs(h) % 1_000_000_000);
}

async function main() {
  const { tracks, achievements, issues } = loadContent(path.join(process.cwd(), "content"));
  const errors = issues.filter((i) => i.level === "error");
  // A module with errors is skipped as a whole; everything else must be clean
  const modulePaths = tracks.flatMap((t) => t.modules.map((m) => m.path));
  const brokenModules = new Set(
    tracks.flatMap((t) =>
      t.modules.filter((m) => errors.some((e) => e.path === m.path || e.path.startsWith(`${m.path}/`))).map((m) => m.slug)
    )
  );
  // Modules outside --modules are skipped the same way: not synced, not archived
  const unselected = new Set(
    onlyModules ? tracks.flatMap((t) => t.modules.filter((m) => !onlyModules.has(m.slug)).map((m) => m.slug)) : []
  );
  // Anything inside a module folder belongs to that module, even before its module.yaml exists
  const inModuleFolder = (p: string) => /(^|\/)tracks\/[^/]+\/\d{2}-[^/]+(\/|$)/.test(p);
  const loose = errors.filter(
    (e) => !inModuleFolder(e.path) && !modulePaths.some((p) => e.path === p || e.path.startsWith(`${p}/`))
  );
  if (loose.length > 0 && !force) {
    for (const e of loose) console.error(`error ${e.path}: ${e.message}`);
    console.error(`\n${loose.length} content error(s) outside modules. Fix them or pass --force.`);
    process.exit(1);
  }
  for (const t of tracks) {
    const skipped = t.modules.filter((m) => brokenModules.has(m.slug) && !unselected.has(m.slug));
    for (const m of skipped) {
      const count = errors.filter((e) => e.path.startsWith(m.path)).length;
      console.warn(`skip  ${m.path}: ${count} error(s); run content:validate --only ${m.slug}`);
    }
    t.modules = t.modules.filter((m) => !brokenModules.has(m.slug) && !unselected.has(m.slug));
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const stats = { tracks: 0, modules: 0, lessons: 0, exercises: 0, capstones: 0, achievements: 0, archived: 0 };
  const now = new Date();

  const keep = {
    tracks: new Set<string>(),
    modules: new Set<string>(),
    lessons: new Set<string>(),
    exercises: new Set<string>(),
    projects: new Set<string>(),
    achievements: new Set<string>(),
  };

  try {
    if (dryRun) {
      for (const t of tracks) {
        console.log(`${t.slug}: ${t.modules.length} modules`);
        for (const m of t.modules)
          console.log(`  ${String(m.order).padStart(2, "0")} ${m.slug}: ${m.lessons.length} lessons, ${m.exercises.size} drills${m.capstone ? ", capstone" : ""}`);
      }
      console.log(`${achievements.length} achievements`);
      return;
    }

    // Park the live orders of everything being synced, so reordering never collides.
    // Skipped modules keep their rows (and orders) untouched.
    const syncing = tracks.flatMap((t) => t.modules.map((m) => m.slug));
    await prisma.$transaction([
      prisma.$executeRaw`UPDATE "tracks" SET "order" = -1000 - "order" WHERE "order" > 0`,
      prisma.$executeRaw`UPDATE "modules" SET "order" = -1000 - "order" WHERE "order" > 0 AND "slug" = ANY(${syncing})`,
      prisma.$executeRaw`UPDATE "lessons" SET "order" = -1000 - "order" WHERE "order" > 0 AND "slug" IS NOT NULL AND "moduleId" IN (SELECT "id" FROM "modules" WHERE "slug" = ANY(${syncing}))`,
      prisma.$executeRaw`UPDATE "exercises" SET "order" = -1000 - "order" WHERE "order" > 0 AND "slug" IS NOT NULL AND "lessonId" IN (SELECT l."id" FROM "lessons" l JOIN "modules" m ON m."id" = l."moduleId" WHERE m."slug" = ANY(${syncing}))`,
    ], { maxWait: 30_000, timeout: 60_000 }); // Neon's free tier can take a while to wake

    for (const t of tracks) {
      const track = await prisma.track.upsert({
        where: { slug: t.slug },
        create: { slug: t.slug, title: t.title, summary: t.summary, grade: t.grade, order: t.order },
        update: { title: t.title, summary: t.summary, grade: t.grade, order: t.order, archivedAt: null },
      });
      keep.tracks.add(track.id);
      stats.tracks++;

      for (const m of t.modules) {
        const phase = t.grade === "kyu" ? beltForModule(m.order).label : `${ordinal(m.order + 1)} dan`;
        const moduleData = {
          trackId: track.id,
          title: m.title,
          summary: m.summary,
          description: m.description,
          outcomes: m.outcomes,
          phase,
          order: m.order,
          duration: Math.round(m.hours),
          checkpointPick: m.checkpoint.pick,
          checkpointPassMark: m.checkpoint.pass_mark,
          checkpointPool: m.checkpoint.pool,
          archivedAt: null,
        };
        const mod = await prisma.module.upsert({
          where: { slug: m.slug },
          create: { slug: m.slug, ...moduleData },
          update: moduleData,
        });
        keep.modules.add(mod.id);
        stats.modules++;

        for (const l of m.lessons) {
          const lessonData = {
            moduleId: mod.id,
            title: l.title,
            description: l.summary,
            content: l.body,
            order: l.order,
            estimatedTime: l.minutes,
            lab: l.lab ?? Prisma.DbNull,
            archivedAt: null,
          };
          const lesson = await prisma.lesson.upsert({
            where: { slug: l.slug },
            create: { slug: l.slug, ...lessonData },
            update: lessonData,
          });
          keep.lessons.add(lesson.id);
          stats.lessons++;

          const drills: Array<[ContentExercise, boolean]> = [
            ...l.exercises.map((s) => [m.exercises.get(s)!, true] as [ContentExercise, boolean]),
            ...l.optional.map((s) => [m.exercises.get(s)!, false] as [ContentExercise, boolean]),
          ];
          for (const [i, [ex, required]] of drills.entries()) {
            const exerciseData = {
              lessonId: lesson.id,
              title: ex.title,
              description: firstParagraph(ex.prompt),
              instructions: ex.prompt,
              starterCode: ex.starter,
              solution: ex.solution,
              files: ex.extraFiles.length > 0 ? ex.extraFiles : Prisma.DbNull,
              mainFile: ex.mainFile,
              testCases: JSON.stringify(ex.type === "predict" ? [] : parseTestNames(ex.tests)),
              tests: ex.tests,
              type: ex.type,
              hints: JSON.stringify(ex.hints),
              difficulty: ex.difficulty,
              tags: ex.tags,
              packages: ex.packages,
              timeoutMs: Math.round(ex.timeout * 1000),
              importSolution: ex.importSolution,
              required,
              order: i + 1,
              xpReward: ex.xpReward,
              archivedAt: null,
            };
            const exercise = await prisma.exercise.upsert({
              where: { slug: ex.slug },
              create: { slug: ex.slug, ...exerciseData },
              update: exerciseData,
            });
            keep.exercises.add(exercise.id);
            stats.exercises++;
          }
        }

        if (m.capstone) {
          const c = m.capstone;
          const projectData = {
            moduleId: mod.id,
            title: c.title,
            summary: c.summary,
            description: c.brief,
            requirements: JSON.stringify(c.requirements),
            successCriteria: JSON.stringify(c.criteria),
            acceptance: c.suite ? { files: c.suite, requirements: c.acceptance.requirements } : Prisma.DbNull,
            starterTemplate: c.starter,
            estimatedTime: Math.round(c.hours * 60), // minutes, as the project pages expect
            xpReward: c.xp,
            archivedAt: null,
          };
          const project = await prisma.project.upsert({
            where: { slug: c.slug },
            create: { slug: c.slug, ...projectData },
            update: projectData,
          });
          keep.projects.add(project.id);
          stats.capstones++;
        }
      }
    }

    for (const [i, a] of achievements.entries()) {
      const data = {
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        tier: a.tier,
        xpReward: a.xp,
        criteria: JSON.stringify(a.criteria),
        order: i + 1,
        archivedAt: null,
      };
      // Adopt a legacy row with the same name so learners keep what they earned
      const legacy = await prisma.achievement.findFirst({ where: { name: a.name, slug: null } });
      const row = legacy
        ? await prisma.achievement.update({ where: { id: legacy.id }, data: { slug: a.slug, ...data } })
        : await prisma.achievement.upsert({
            where: { slug: a.slug },
            create: { slug: a.slug, ...data },
            update: data,
          });
      keep.achievements.add(row.id);
      stats.achievements++;
    }

    // Archive what content/ no longer has, parking its order out of the way
    const archive = async (
      rows: Array<{ id: string }>,
      update: (id: string) => Promise<unknown>
    ) => {
      for (const r of rows) {
        await update(r.id);
        stats.archived++;
      }
    };
    await archive(
      await prisma.track.findMany({ where: { id: { notIn: [...keep.tracks] }, archivedAt: null }, select: { id: true } }),
      (id) => prisma.track.update({ where: { id }, data: { archivedAt: now, order: parkedOrder(id) } })
    );
    // Rows belonging to skipped modules are neither synced nor archived
    const skippedSlugs = [...brokenModules, ...unselected];
    const notSkipped = { OR: [{ slug: null }, { slug: { notIn: skippedSlugs } }] };
    await archive(
      await prisma.module.findMany({
        where: { id: { notIn: [...keep.modules] }, archivedAt: null, ...notSkipped },
        select: { id: true },
      }),
      (id) => prisma.module.update({ where: { id }, data: { archivedAt: now, order: parkedOrder(id) } })
    );
    await archive(
      await prisma.lesson.findMany({
        where: { id: { notIn: [...keep.lessons] }, archivedAt: null, module: notSkipped },
        select: { id: true },
      }),
      (id) => prisma.lesson.update({ where: { id }, data: { archivedAt: now, order: parkedOrder(id) } })
    );
    await archive(
      await prisma.exercise.findMany({
        where: { id: { notIn: [...keep.exercises] }, archivedAt: null, lesson: { module: notSkipped } },
        select: { id: true },
      }),
      (id) => prisma.exercise.update({ where: { id }, data: { archivedAt: now, order: parkedOrder(id) } })
    );
    await archive(
      await prisma.project.findMany({
        where: { id: { notIn: [...keep.projects] }, archivedAt: null, module: notSkipped },
        select: { id: true },
      }),
      (id) => prisma.project.update({ where: { id }, data: { archivedAt: now } })
    );
    await archive(
      await prisma.achievement.findMany({ where: { id: { notIn: [...keep.achievements] }, archivedAt: null }, select: { id: true } }),
      (id) => prisma.achievement.update({ where: { id }, data: { archivedAt: now } })
    );

    // Anything parked but not re-synced (e.g. an archived row from an earlier run) stays parked
    console.log(
      `Synced ${stats.tracks} tracks, ${stats.modules} modules, ${stats.lessons} lessons, ` +
        `${stats.exercises} drills, ${stats.capstones} capstones, ${stats.achievements} achievements. ` +
        `Archived ${stats.archived} item(s).`
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main();
