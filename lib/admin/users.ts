import { prisma } from "@/lib/prisma";
import type { Prisma, Role } from "@/lib/generated/prisma/client";
import { getCurriculumState } from "@/lib/curriculum-state";
import { rankFromTracks } from "@/lib/learner-rank";
import { blackBeltIfDue } from "@/lib/black-belt";
import { CHECKPOINT_RETRY_MINUTES } from "@/lib/mastery-rules";

/**
 * What the admin area reads: the account list, one learner's whole record, the site's numbers and
 * the audit log. Read-only; changes go through lib/admin/actions.ts.
 */

export const USER_FILTERS = ["all", "admins", "unverified", "suspended", "inactive"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];
export const USERS_PER_PAGE = 40;
/** Not seen for this long counts as inactive */
const INACTIVE_DAYS = 30;

const DAY = 86_400_000;

function filterWhere(filter: UserFilter): Prisma.UserWhereInput {
  switch (filter) {
    case "admins":
      return { role: { in: ["ADMIN", "SUPER_ADMIN"] } };
    case "unverified":
      return { emailVerified: null };
    case "suspended":
      return { suspendedAt: { not: null } };
    case "inactive":
      // Not been here (any signed-in page) for a month
      return { OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(Date.now() - INACTIVE_DAYS * DAY) } }] };
    default:
      return {};
  }
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: Date;
  verified: boolean;
  suspended: boolean;
  xp: number;
  level: number;
  /** The last signed-in page view */
  lastSeen: Date | null;
  /** The last training (a lesson, a drill or an approved capstone); null if they never have */
  lastTrained: Date | null;
  modulesPassed: number;
  capstonesPending: number;
}

export async function listUsers({
  q = "",
  filter = "all",
  page = 1,
}: {
  q?: string;
  filter?: UserFilter;
  page?: number;
}) {
  const search = q.trim();
  // AND, not a spread: both the filter and the search use OR, and a spread let the search's replace
  // the filter's (searching under "Inactive" listed active accounts)
  const where: Prisma.UserWhereInput = {
    AND: [
      filterWhere(filter),
      search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { id: search },
            ],
          }
        : {},
    ],
  };
  const [total, users, counts] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * USERS_PER_PAGE,
      take: USERS_PER_PAGE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        suspendedAt: true,
        xp: true,
        level: true,
        lastSeenAt: true,
        streak: { select: { lastActivityDate: true, longestStreak: true } },
        _count: {
          select: {
            checkpointAttempts: { where: { passed: true } },
            projectSubmissions: { where: { status: "pending" } },
          },
        },
      },
    }),
    filterCounts(),
  ]);
  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    verified: u.emailVerified !== null,
    suspended: u.suspendedAt !== null,
    xp: u.xp,
    level: u.level,
    lastSeen: u.lastSeenAt,
    // The streak row is made at sign-up, dated then: a streak that never started means never trained
    lastTrained: u.streak && u.streak.longestStreak > 0 ? u.streak.lastActivityDate : null,
    modulesPassed: u._count.checkpointAttempts,
    capstonesPending: u._count.projectSubmissions,
  }));
  return { total, rows, pages: Math.max(1, Math.ceil(total / USERS_PER_PAGE)), counts };
}

/** How many accounts each filter holds, for the filter tabs */
export async function filterCounts(): Promise<Record<UserFilter, number>> {
  const entries = await Promise.all(
    USER_FILTERS.map(async (f) => [f, await prisma.user.count({ where: filterWhere(f) })] as const)
  );
  return Object.fromEntries(entries) as Record<UserFilter, number>;
}

/** One learner's whole record, for /admin/users/[id] */
export async function getUserRecord(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      emailVerified: true,
      suspendedAt: true,
      suspendedReason: true,
      lastSeenAt: true,
      onboardedAt: true,
      experience: true,
      goal: true,
      weeklyHours: true,
      xp: true,
      level: true,
      password: true,
      accounts: { select: { provider: true } },
      streak: { select: { currentStreak: true, longestStreak: true, lastActivityDate: true } },
      aiCredential: { select: { provider: true, model: true, updatedAt: true } },
    },
  });
  if (!user) return null;

  const [
    tracks,
    attempts,
    drills,
    submissions,
    certificates,
    achievements,
    logEntries,
    aiCalls,
    history,
  ] = await Promise.all([
    getCurriculumState(userId),
    prisma.checkpointAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 30,
      select: {
        id: true,
        moduleId: true,
        coversModuleIds: true,
        belt: true,
        placement: true,
        passed: true,
        score: true,
        startedAt: true,
        submittedAt: true,
        grantedById: true,
        exerciseIds: true,
        module: { select: { title: true, order: true, track: { select: { slug: true } } } },
      },
    }),
    prisma.exerciseSubmission.groupBy({
      by: ["passed"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.projectSubmission.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        evaluatedAt: true,
        project: { select: { title: true, module: { select: { order: true } } } },
      },
    }),
    prisma.certificate.findMany({
      where: { userId },
      select: {
        code: true,
        track: true,
        name: true,
        issuedAt: true,
        withdrawnAt: true,
        revokedAt: true,
        revokedReason: true,
      },
    }),
    prisma.userAchievement.count({ where: { userId } }),
    prisma.learningLogEntry.count({ where: { userId } }),
    prisma.llmUsage.count({ where: { userId } }),
    prisma.adminAction.findMany({
      where: { targetId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const blackBelt = await blackBeltIfDue(userId, tracks);
  const rank = rankFromTracks(tracks, blackBelt);
  const retryAfter = Date.now() - CHECKPOINT_RETRY_MINUTES * 60_000;
  const cooling = new Set(
    attempts
      .filter((a) => !a.passed && a.submittedAt && a.submittedAt.getTime() > retryAfter)
      .map((a) => a.module.title)
  );
  // Modules passed by an admin's grant rather than a grading
  const granted = new Set(attempts.filter((a) => a.passed && a.grantedById).map((a) => a.moduleId));
  const passedDrills = drills.find((d) => d.passed)?._count._all ?? 0;
  const failedRuns = drills.find((d) => !d.passed)?._count._all ?? 0;

  return {
    user: {
      ...user,
      password: undefined,
      hasPassword: Boolean(user.password),
      providers: user.accounts.map((a) => a.provider),
    },
    rank,
    tracks: tracks.map((t) => ({
      slug: t.slug,
      title: t.title,
      modules: t.modules.map((m) => ({
        id: m.id,
        order: m.order,
        title: m.title,
        passed: m.passed,
        unlocked: m.unlocked,
        placement: m.checkpoint.placement,
        gradable: m.checkpoint.poolSize > 0,
        lessonsDone: m.lessonsDone,
        lessonsTotal: m.lessonsTotal,
        cooling: cooling.has(m.title),
        granted: granted.has(m.id),
      })),
    })),
    attempts,
    drills: { passedRuns: passedDrills, failedRuns },
    submissions,
    certificates,
    counts: { achievements, logEntries, aiCalls },
    history,
  };
}

export type UserRecord = NonNullable<Awaited<ReturnType<typeof getUserRecord>>>;

/** The site's numbers for the admin overview */
export async function overviewStats() {
  const now = Date.now();
  const since = (days: number) => new Date(now - days * DAY);
  const [
    users,
    signups7,
    signups30,
    active7,
    seen7,
    unverified,
    suspended,
    gradings30,
    passed30,
    pending,
    certificates,
    daily,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since(7) } } }),
    prisma.user.count({ where: { createdAt: { gte: since(30) } } }),
    // Trained this week (the streak's day moves only with training), and seen at all this week
    prisma.streak.count({ where: { lastActivityDate: { gte: since(7) }, longestStreak: { gt: 0 } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: since(7) } } }),
    prisma.user.count({ where: { emailVerified: null } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.checkpointAttempt.count({
      where: { submittedAt: { gte: since(30) }, grantedById: null },
    }),
    prisma.checkpointAttempt.count({
      where: { submittedAt: { gte: since(30) }, passed: true, grantedById: null },
    }),
    prisma.projectSubmission.count({ where: { status: "pending" } }),
    prisma.certificate.count({ where: { revokedAt: null } }),
    prisma.user.findMany({ where: { createdAt: { gte: since(14) } }, select: { createdAt: true } }),
  ]);
  // Sign-ups per day for the last 14 days, oldest first
  const perDay = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(now - (13 - i) * DAY);
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + DAY;
    return {
      day: start.toISOString(),
      count: daily.filter(
        (u) => u.createdAt.getTime() >= start.getTime() && u.createdAt.getTime() < end
      ).length,
    };
  });
  return {
    users,
    signups7,
    signups30,
    active7,
    seen7,
    unverified,
    suspended,
    gradings30,
    passed30,
    pending,
    certificates,
    perDay,
  };
}

export const ACTIONS_PER_PAGE = 50;

export async function listActions({ page = 1, targetId }: { page?: number; targetId?: string }) {
  const where = targetId ? { targetId } : {};
  const [total, rows] = await Promise.all([
    prisma.adminAction.count({ where }),
    prisma.adminAction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ACTIONS_PER_PAGE,
      take: ACTIONS_PER_PAGE,
    }),
  ]);
  return { total, rows, pages: Math.max(1, Math.ceil(total / ACTIONS_PER_PAGE)) };
}

/** An audit action in words */
export const ACTION_LABEL: Record<string, string> = {
  "user.suspend": "Suspended",
  "user.unsuspend": "Lifted suspension",
  "user.delete": "Deleted account",
  "user.role": "Changed role",
  "user.verify": "Marked email confirmed",
  "user.reset-link": "Sent password-reset link",
  "module.grant": "Granted module pass",
  "module.revoke": "Revoked module pass",
  "grading.clear-cooldown": "Cleared grading wait",
  "certificate.revoke": "Revoked certificate",
  "certificate.reinstate": "Reinstated certificate",
};
