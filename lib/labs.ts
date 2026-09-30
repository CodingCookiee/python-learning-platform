import { randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import { labSpecSchema, type LabSpec } from "@/lib/content/schema";
import { publicOrigin } from "@/lib/public-origin";
import { checkAndUnlockAchievements, updateStreak, updateUserLevel } from "@/lib/achievements";

/**
 * Local labs: work the learner does on their own machine (n8n, a scheduled job,
 * a CLI, a deployed service) and the check that confirms it. See labSpecSchema
 * for the three kinds. A lab is optional practice: it never blocks a lesson.
 */

export const LAB_XP = 15;
const MAX_STORED = 4_000;

export interface LabCheck {
  passed: boolean;
  /** Human-readable lines: what matched and what didn't */
  notes: string[];
}

export interface LabView {
  spec: LabSpec;
  lessonId: string;
  webhookUrl: string | null;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  lastResult: LabCheck | null;
  lastPayload: string | null;
  checks: number;
}

export function parseLab(value: unknown): LabSpec | null {
  if (!value) return null;
  const parsed = labSpecSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

async function runFor(userId: string, lessonId: string) {
  return prisma.labRun.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, token: randomBytes(18).toString("base64url") },
    update: {},
  });
}

export function webhookUrl(token: string): string {
  return `${publicOrigin()}/api/labs/hook/${token}`;
}

function view(spec: LabSpec, run: Awaited<ReturnType<typeof runFor>>): LabView {
  let lastResult: LabCheck | null = null;
  try {
    lastResult = run.lastResult ? (JSON.parse(run.lastResult) as LabCheck) : null;
  } catch {
    lastResult = null;
  }
  return {
    spec,
    lessonId: run.lessonId,
    webhookUrl: spec.kind === "webhook" ? webhookUrl(run.token) : null,
    verifiedAt: run.verifiedAt?.toISOString() ?? null,
    lastCheckedAt: run.lastCheckedAt?.toISOString() ?? null,
    lastResult,
    lastPayload: run.lastPayload,
    checks: run.checks,
  };
}

/** The lesson's lab with the learner's status, creating their lab URL on first view. */
export async function getLabForUser(userId: string, lessonId: string): Promise<LabView | null> {
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, archivedAt: null }, select: { lab: true } });
  const spec = parseLab(lesson?.lab);
  if (!spec) return null;
  return view(spec, await runFor(userId, lessonId));
}

// Checks

function at(value: unknown, dotted: string): unknown {
  let cur: unknown = value;
  for (const part of dotted.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur) && /^\d+$/.test(part)) cur = cur[Number(part)];
    else if (typeof cur === "object") cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return cur;
}

const show = (v: unknown) => (v === undefined ? "nothing" : JSON.stringify(v));

/** Every expected field present with the expected value (strings compare case-sensitively, trimmed) */
export function checkFields(spec: LabSpec, body: unknown): LabCheck {
  const notes: string[] = [];
  let passed = true;
  for (const [path, expected] of Object.entries(spec.expect)) {
    const got = at(body, path);
    const ok =
      typeof expected === "string"
        ? typeof got === "string" && got.trim() === expected.trim()
        : got === expected || (typeof got === "string" && got.trim() === String(expected));
    if (!ok) passed = false;
    notes.push(ok ? `✓ ${path} is ${show(expected)}` : `✗ ${path} should be ${show(expected)}, got ${show(got)}`);
  }
  return { passed, notes };
}

export function checkOutput(spec: LabSpec, output: string): LabCheck {
  const notes: string[] = [];
  let passed = true;
  for (const p of spec.patterns) {
    const ok = new RegExp(p, "m").test(output);
    if (!ok) passed = false;
    notes.push(ok ? `✓ found ${p}` : `✗ didn't find ${p}`);
  }
  return { passed, notes };
}

// Probing a learner's deployed URL without letting it reach our own network

function privateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? privateAddress(mapped[1]!) : false;
  }
  const [a, b] = ip.split(".").map(Number) as [number, number];
  return (
    a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}

async function safeUrl(raw: string): Promise<URL | string> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "That isn't a URL.";
  }
  if (url.protocol !== "https:") return "Use an https:// URL (deploy it somewhere public first).";
  if (url.username || url.password) return "Leave credentials out of the URL.";
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) return `Couldn't find ${host}. Check the address.`;
  if (addresses.some(privateAddress)) return "That address is on a private network, which the checker can't reach.";
  return url;
}

export async function probeUrl(spec: LabSpec, base: string): Promise<{ check: LabCheck; payload: string }> {
  const target = await safeUrl(base.replace(/\/$/, "") + (spec.path ?? ""));
  if (typeof target === "string") return { check: { passed: false, notes: [`✗ ${target}`] }, payload: "" };
  let res: Response;
  try {
    res = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(8_000), headers: { "user-agent": "pylearn-lab-check" } });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    return { check: { passed: false, notes: [timeout ? "✗ No answer within 8 seconds." : "✗ Couldn't connect."] }, payload: "" };
  }
  const text = (await res.text()).slice(0, 64_000);
  const notes = [`${res.ok ? "✓" : "✗"} GET ${target.pathname} answered ${res.status}`];
  let passed = res.ok;
  if (spec.contains) {
    const ok = text.includes(spec.contains);
    passed &&= ok;
    notes.push(ok ? `✓ the body contains ${show(spec.contains)}` : `✗ the body doesn't contain ${show(spec.contains)}`);
  }
  if (Object.keys(spec.expect).length > 0) {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
    const fields = checkFields(spec, body);
    passed &&= fields.passed;
    notes.push(...(body === undefined ? ["✗ the response isn't JSON"] : fields.notes));
  }
  return { check: { passed, notes }, payload: text };
}

/** Save a check; the first pass earns the lab's XP. */
export async function recordLabCheck(
  runId: string,
  userId: string,
  check: LabCheck,
  payload: string
): Promise<{ newlyVerified: boolean }> {
  const run = await prisma.labRun.update({
    where: { id: runId },
    data: {
      lastResult: JSON.stringify(check),
      lastPayload: payload.slice(0, MAX_STORED),
      lastCheckedAt: new Date(),
      checks: { increment: 1 },
    },
  });
  if (!check.passed || run.verifiedAt) return { newlyVerified: false };
  const claimed = await prisma.labRun.updateMany({ where: { id: runId, verifiedAt: null }, data: { verifiedAt: new Date() } });
  if (claimed.count === 0) return { newlyVerified: false };
  await prisma.user.update({ where: { id: userId }, data: { xp: { increment: LAB_XP } } });
  await updateUserLevel(userId);
  await updateStreak(userId);
  await checkAndUnlockAchievements(userId);
  return { newlyVerified: true };
}

export async function runForToken(token: string) {
  if (!/^[\w-]{10,64}$/.test(token)) return null;
  return prisma.labRun.findUnique({ where: { token }, include: { lesson: { select: { lab: true, archivedAt: true } } } });
}

export { runFor as ensureLabRun };
