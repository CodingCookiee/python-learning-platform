/**
 * npm run content:sync [-- --dry-run] [--force]
 *
 * Copies content/ into the database, matching rows by slug. Idempotent:
 * run it as often as you like. Items removed from content/ are archived
 * (hidden from learners) rather than deleted, so no progress is ever lost.
 * Pre-content legacy rows (no slug) are archived too.
 *
 * Refuses to run while content:validate --quick reports errors, unless --force.
 */

import dotenv from "dotenv";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma/client";
import { loadContent } from "../../lib/content/load";
import { beltForModule, ordinal } from "../../lib/ranks";
import type { ContentExercise } from "../../lib/content/schema";

dotenv.config({ quiet: true });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

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
  if (errors.length > 0 && !force) {
    for (const e of errors) console.error(`error ${e.path}: ${e.message}`);
    console.error(`\n${errors.length} content error(s). Fix them or pass --force.`);
    process.exit(1);
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

    // Park every live order out of the way first, so reordering never collides
    await prisma.$transaction([
      prisma.$executeRaw`UPDATE "tracks" SET "order" = -1000 - "order" WHERE "order" > 0`,
      prisma.$executeRaw`UPDATE "modules" SET "order" = -1000 - "order" WHERE "order" > 0 AND "slug" IS NOT NULL`,
      prisma.$executeRaw`UPDATE "lessons" SET "order" = -1000 - "order" WHERE "order" > 0 AND "slug" IS NOT NULL`,
      prisma.$executeRaw`UPDATE "exercises" SET "order" = -1000 - "order" WHERE "order" > 0 AND "slug" IS NOT NULL`,
    ]);

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
              testCases: JSON.stringify(ex.type === "predict" ? [] : parseTestNames(ex.tests)),
              tests: ex.tests,
              type: ex.type,
              hints: JSON.stringify(ex.hints),
              difficulty: ex.difficulty,
              tags: ex.tags,
              packages: ex.packages,
              timeoutMs: Math.round(ex.timeout * 1000),
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
            starterTemplate: c.starter,
            estimatedTime: Math.round(c.hours),
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
    await archive(
      await prisma.module.findMany({ where: { id: { notIn: [...keep.modules] }, archivedAt: null }, select: { id: true } }),
      (id) => prisma.module.update({ where: { id }, data: { archivedAt: now, order: parkedOrder(id) } })
    );
    await archive(
      await prisma.lesson.findMany({ where: { id: { notIn: [...keep.lessons] }, archivedAt: null }, select: { id: true } }),
      (id) => prisma.lesson.update({ where: { id }, data: { archivedAt: now, order: parkedOrder(id) } })
    );
    await archive(
      await prisma.exercise.findMany({ where: { id: { notIn: [...keep.exercises] }, archivedAt: null }, select: { id: true } }),
      (id) => prisma.exercise.update({ where: { id }, data: { archivedAt: now, order: parkedOrder(id) } })
    );
    await archive(
      await prisma.project.findMany({ where: { id: { notIn: [...keep.projects] }, archivedAt: null }, select: { id: true } }),
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
