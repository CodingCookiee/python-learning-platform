import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { ZodType } from "zod";
import {
  achievementSchema,
  capstoneSchema,
  DEFAULT_XP,
  exerciseSchema,
  lessonFrontmatterSchema,
  moduleSchema,
  quizSchema,
  trackSchema,
  type ContentAchievement,
  type ContentCapstone,
  type ContentExercise,
  type ContentIssue,
  type ContentLesson,
  type ContentModule,
  type ContentTrack,
} from "./schema";

/**
 * Reads content/ into memory and reports structural problems. Pure file work:
 * running drills is scripts/content/validate.ts's job.
 */

export interface LoadResult {
  tracks: ContentTrack[];
  achievements: ContentAchievement[];
  issues: ContentIssue[];
}

const ORDERED = /^(\d{2})-([a-z0-9-]+?)(\.md)?$/;

function rel(root: string, p: string) {
  return path.relative(path.dirname(root), p).split(path.sep).join("/");
}

function read(p: string): string {
  return readFileSync(p, "utf8").replace(/\r\n/g, "\n");
}

function readOptional(p: string): string | null {
  return existsSync(p) ? read(p) : null;
}

function dirs(p: string): string[] {
  if (!existsSync(p)) return [];
  return readdirSync(p)
    .filter((name) => !name.startsWith(".") && statSync(path.join(p, name)).isDirectory())
    .sort();
}

function files(p: string, ext: string): string[] {
  if (!existsSync(p)) return [];
  return readdirSync(p)
    .filter((name) => name.endsWith(ext))
    .sort();
}

export function splitFrontmatter(source: string): { data: unknown; body: string } | null {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source);
  if (!match) return null;
  return { data: parseYaml(match[1]!), body: match[2]!.replace(/^\n+/, "") };
}

export function loadContent(root = path.join(process.cwd(), "content")): LoadResult {
  const issues: ContentIssue[] = [];
  const err = (p: string, message: string) => issues.push({ level: "error", path: rel(root, p), message });
  const warn = (p: string, message: string) =>
    issues.push({ level: "warning", path: rel(root, p), message });

  function parse<T>(schema: ZodType<T>, value: unknown, p: string): T | null {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    for (const issue of result.error.issues) {
      err(p, `${issue.path.join(".") || "(file)"}: ${issue.message}`);
    }
    return null;
  }

  function yamlFile<T>(schema: ZodType<T>, p: string): T | null {
    if (!existsSync(p)) {
      err(p, "missing file");
      return null;
    }
    try {
      return parse(schema, parseYaml(read(p)), p);
    } catch (e) {
      err(p, `invalid YAML: ${(e as Error).message}`);
      return null;
    }
  }

  function checkOrder(p: string, orders: number[]) {
    orders.forEach((order, i) => {
      if (order !== i + 1) err(p, `numbering should run 01, 02, 03… without gaps (found ${String(order).padStart(2, "0")} at position ${i + 1})`);
    });
  }

  function checkLessonBody(p: string, body: string) {
    if (/^#\s/.test(body)) warn(p, "starts with a # heading; the page already shows the title");
    for (const m of body.matchAll(/```quiz\n([\s\S]*?)```/g)) {
      try {
        parse(quizSchema, parseYaml(m[1]!), `${p} (quiz)`);
      } catch (e) {
        err(p, `quiz block is invalid YAML: ${(e as Error).message}`);
      }
    }
  }

  function loadExercise(dir: string, slug: string): ContentExercise | null {
    const meta = yamlFile(exerciseSchema, path.join(dir, "exercise.yaml"));
    const prompt = readOptional(path.join(dir, "prompt.md"));
    const starter = readOptional(path.join(dir, "starter.py"));
    const solution = readOptional(path.join(dir, "solution.py"));
    const tests = readOptional(path.join(dir, "tests.py"));
    if (prompt === null) err(dir, "missing prompt.md");
    if (starter === null) err(dir, "missing starter.py");
    if (meta && meta.type !== "predict") {
      if (solution === null) err(dir, "missing solution.py");
      if (tests === null) err(dir, "missing tests.py");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) err(dir, "folder name must be a kebab-case slug");
    if (!meta || prompt === null || starter === null) return null;
    return {
      ...meta,
      slug,
      path: rel(root, dir),
      prompt,
      starter,
      solution: solution ?? starter,
      tests: tests ?? "",
      xpReward: meta.xp ?? DEFAULT_XP[meta.difficulty],
    };
  }

  function loadCapstone(dir: string): ContentCapstone | null {
    if (!existsSync(dir)) return null;
    const meta = yamlFile(capstoneSchema, path.join(dir, "capstone.yaml"));
    const brief = readOptional(path.join(dir, "brief.md"));
    if (brief === null) err(dir, "missing brief.md");
    if (!meta || brief === null) return null;
    return { ...meta, path: rel(root, dir), brief, starter: readOptional(path.join(dir, "starter.py")) };
  }

  function loadModule(dir: string, order: number): ContentModule | null {
    const meta = yamlFile(moduleSchema, path.join(dir, "module.yaml"));

    const exercises = new Map<string, ContentExercise>();
    for (const name of dirs(path.join(dir, "exercises"))) {
      const ex = loadExercise(path.join(dir, "exercises", name), name);
      if (ex) exercises.set(name, ex);
    }

    const lessons: ContentLesson[] = [];
    const lessonDir = path.join(dir, "lessons");
    const lessonFiles = files(lessonDir, ".md");
    if (lessonFiles.length === 0) warn(dir, "has no lessons yet");
    for (const name of lessonFiles) {
      const p = path.join(lessonDir, name);
      const m = ORDERED.exec(name);
      if (!m) {
        err(p, "lesson files are named NN-slug.md");
        continue;
      }
      const split = splitFrontmatter(read(p));
      if (!split) {
        err(p, "missing --- frontmatter ---");
        continue;
      }
      const front = parse(lessonFrontmatterSchema, split.data, p);
      if (!front) continue;
      if (front.slug !== m[2]) warn(p, `file name says "${m[2]}" but slug is "${front.slug}"`);
      checkLessonBody(p, split.body);
      for (const s of [...front.exercises, ...front.optional]) {
        if (!exercises.has(s)) err(p, `exercise "${s}" doesn't exist in ${rel(root, path.join(dir, "exercises"))}`);
      }
      lessons.push({ ...front, order: Number(m[1]), path: rel(root, p), body: split.body });
    }
    checkOrder(lessonDir, lessons.map((l) => l.order));

    // Every drill belongs to exactly one lesson
    const owners = new Map<string, string[]>();
    for (const l of lessons) {
      for (const s of [...l.exercises, ...l.optional]) owners.set(s, [...(owners.get(s) ?? []), l.slug]);
    }
    for (const [s, ex] of exercises) {
      const by = owners.get(s) ?? [];
      if (by.length === 0) warn(path.join(root, "..", ex.path), "isn't listed in any lesson");
      if (by.length > 1) err(path.join(root, "..", ex.path), `is listed in more than one lesson (${by.join(", ")})`);
    }

    const capstone = loadCapstone(path.join(dir, "capstone"));
    if (!meta) return null;
    return { ...meta, order, path: rel(root, dir), lessons, exercises, capstone };
  }

  const tracks: ContentTrack[] = [];
  const tracksDir = path.join(root, "tracks");
  if (!existsSync(tracksDir)) {
    err(tracksDir, "missing content/tracks");
    return { tracks, achievements: [], issues };
  }
  for (const name of dirs(tracksDir)) {
    const dir = path.join(tracksDir, name);
    const meta = yamlFile(trackSchema, path.join(dir, "track.yaml"));
    const modules: ContentModule[] = [];
    for (const modName of dirs(dir)) {
      const m = ORDERED.exec(modName);
      const modDir = path.join(dir, modName);
      if (!m) {
        err(modDir, "module folders are named NN-slug");
        continue;
      }
      const mod = loadModule(modDir, Number(m[1]));
      if (mod) {
        if (mod.slug !== m[2]) warn(modDir, `folder name says "${m[2]}" but slug is "${mod.slug}"`);
        modules.push(mod);
      }
    }
    checkOrder(dir, modules.map((m) => m.order));
    if (meta) tracks.push({ ...meta, path: rel(root, dir), modules });
  }
  tracks.sort((a, b) => a.order - b.order);

  // Slugs are unique platform-wide, per kind
  const seen = new Map<string, string>();
  const claim = (kind: string, s: string, p: string) => {
    const key = `${kind}:${s}`;
    const prev = seen.get(key);
    if (prev) issues.push({ level: "error", path: p, message: `${kind} slug "${s}" is also used by ${prev}` });
    else seen.set(key, p);
  };
  for (const t of tracks) {
    claim("track", t.slug, t.path);
    for (const m of t.modules) {
      claim("module", m.slug, m.path);
      m.lessons.forEach((l) => claim("lesson", l.slug, l.path));
      m.exercises.forEach((e) => claim("exercise", e.slug, e.path));
      if (m.capstone) claim("capstone", m.capstone.slug, m.capstone.path);
    }
  }

  // Achievements, with their module references checked
  const achievements: ContentAchievement[] = [];
  const achievementsFile = path.join(root, "achievements.yaml");
  if (existsSync(achievementsFile)) {
    let raw: unknown;
    try {
      raw = parseYaml(read(achievementsFile));
    } catch (e) {
      err(achievementsFile, `invalid YAML: ${(e as Error).message}`);
    }
    const list = Array.isArray(raw) ? raw : [];
    const moduleSlugs = new Set(tracks.flatMap((t) => t.modules.map((m) => m.slug)));
    const capstoneModules = new Set(
      tracks.flatMap((t) => t.modules.filter((m) => m.capstone).map((m) => m.slug))
    );
    list.forEach((item, i) => {
      const a = parse(achievementSchema, item, `${achievementsFile} [${i}]`);
      if (!a) return;
      claim("achievement", a.slug, rel(root, achievementsFile));
      const refs = a.criteria.kind === "modules" ? a.criteria.modules : a.criteria.kind === "capstone" ? [a.criteria.module] : [];
      for (const r of refs) {
        if (!moduleSlugs.has(r)) warn(achievementsFile, `${a.slug}: module "${r}" isn't in content yet`);
        else if (a.criteria.kind === "capstone" && !capstoneModules.has(r))
          warn(achievementsFile, `${a.slug}: module "${r}" has no capstone yet`);
      }
      achievements.push(a);
    });
  }

  return { tracks, achievements, issues };
}
