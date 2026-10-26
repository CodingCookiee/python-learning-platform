import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The routes read the session through withAuth; each test says who is signed in
const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (session.userId ? { user: { id: session.userId, sessionVersion: 0 } } : null)),
}));
// The site's other super admins, so the last-super-admin guard can be met without touching real accounts
const superAdmins = vi.hoisted(() => ({ others: null as number | null }));
vi.mock("@/lib/admin/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/actions")>();
  return {
    ...actual,
    otherActiveSuperAdmins: vi.fn(async (id: string) => superAdmins.others ?? actual.otherActiveSuperAdmins(id)),
  };
});

import { prisma } from "@/lib/prisma";
import { POST as evaluate } from "@/app/api/admin/projects/submissions/[submissionId]/evaluate/route";
import { GET as listQueue } from "@/app/api/admin/projects/submissions/route";
import { DELETE as deleteAccount } from "@/app/api/settings/delete/route";
import { grantModulePass, markVerified, suspendUser, unsuspendUser } from "@/lib/admin/actions";
import { listPendingSubmissions } from "@/lib/admin/submissions";
import { makeLearner } from "./helpers";

type Learner = Awaited<ReturnType<typeof makeLearner>>;
const people: Learner[] = [];
async function person(label: string, data: Record<string, unknown> = {}) {
  const p = await makeLearner(label, data);
  people.push(p);
  return p;
}

let project: { id: string; title: string; xpReward: number; moduleId: string };

beforeAll(async () => {
  project = await prisma.project.findFirstOrThrow({
    where: { archivedAt: null, module: { archivedAt: null } },
    select: { id: true, title: true, xpReward: true, moduleId: true },
  });
});
beforeEach(() => {
  session.userId = null;
  superAdmins.others = null;
});
afterAll(async () => {
  const ids = people.map((p) => p.user.id);
  await prisma.adminAction.deleteMany({ where: { OR: [{ adminId: { in: ids } }, { targetId: { in: ids } }] } });
  for (const p of people) await p.cleanup();
});

const files = [{ name: "main.py", size: 15, type: "text/x-python", content: Buffer.from("print('hello')\n").toString("base64") }];
function pending(userId: string) {
  return prisma.projectSubmission.create({
    data: { userId, projectId: project.id, status: "pending", files: JSON.stringify({ type: "files", files, notes: null }) },
  });
}

function grade(submissionId: string, decision: "approved" | "rejected" = "approved") {
  return evaluate(
    new NextRequest(`http://localhost/api/admin/projects/submissions/${submissionId}/evaluate`, {
      method: "POST",
      body: JSON.stringify({ decision, feedback: "Clear structure, tests pass, and the README explains it.", checklist: {} }),
    }),
    { params: Promise.resolve({ submissionId }) }
  );
}

const deleteMe = () =>
  deleteAccount(new NextRequest("http://localhost/api/settings/delete", { method: "DELETE" }), { params: Promise.resolve({}) });

describe("grading a capstone", () => {
  it("won't let an examiner grade their own", async () => {
    const examiner = await person("own-capstone", { role: "ADMIN" });
    const mine = await pending(examiner.user.id);
    session.userId = examiner.user.id;
    const res = await grade(mine.id);
    expect(res.status).toBe(403);
    expect((await prisma.projectSubmission.findUniqueOrThrow({ where: { id: mine.id } })).status).toBe("pending");
  });

  it("decides it once when two examiners press at the same moment, awarding its XP once, on the record", async () => {
    const learner = await person("graded-twice");
    const [a, b] = await Promise.all([person("examiner-a", { role: "ADMIN" }), person("examiner-b", { role: "ADMIN" })]);
    const submission = await pending(learner.user.id);

    // Both requests read the session when they start, then race to flip the status
    session.userId = a.user.id;
    const first = grade(submission.id);
    session.userId = b.user.id;
    const second = grade(submission.id);
    const statuses = (await Promise.all([first, second])).map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);

    // The capstone's XP once; anything more is from achievements the approval unlocked
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: learner.user.id },
      select: { xp: true, achievements: { select: { achievement: { select: { xpReward: true } } } } },
    });
    const fromAchievements = after.achievements.reduce((n, a) => n + a.achievement.xpReward, 0);
    expect(after.xp - fromAchievements).toBe(project.xpReward);
    const log = await prisma.adminAction.findMany({ where: { targetId: learner.user.id, action: "capstone.approve" } });
    expect(log).toHaveLength(1);
    expect(log[0]!.detail).toMatchObject({ submissionId: submission.id, xp: project.xpReward });
    // An approval re-checks achievements, the streak and milestones: hundreds of queries, which take a
    // minute or more against the remote dev database (a second or two next to it in production)
  }, 300_000);

  it("puts a request for changes on the record too", async () => {
    const learner = await person("graded-changes");
    const examiner = await person("examiner-c", { role: "ADMIN" });
    const submission = await pending(learner.user.id);
    session.userId = examiner.user.id;
    expect((await grade(submission.id, "rejected")).status).toBe(200);
    expect(await prisma.adminAction.count({ where: { targetId: learner.user.id, action: "capstone.reject" } })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id }, select: { xp: true } })).xp).toBe(0);
  });
});

describe("the examiner's queue", () => {
  it("lists what's waiting without the files themselves", async () => {
    const learner = await person("queued");
    const examiner = await person("examiner-q", { role: "ADMIN" });
    const submission = await pending(learner.user.id);
    session.userId = examiner.user.id;
    const res = await listQueue(new NextRequest("http://localhost/api/admin/projects/submissions"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain(files[0]!.content);

    const { rows, total } = await listPendingSubmissions({ take: 500 });
    expect(total).toBeGreaterThanOrEqual(1);
    expect(rows.find((r) => r.id === submission.id)).toMatchObject({
      via: "files",
      fileCount: 1,
      submitter: { id: learner.user.id },
      project: { id: project.id },
    });
  });
});

describe("admins act on other people's training, not their own", () => {
  it("refuses to pass a module or confirm an email on the admin's own account", async () => {
    const admin = await person("self-actor", { role: "SUPER_ADMIN", emailVerified: null });
    const me = { id: admin.user.id, email: admin.user.email };
    expect(await grantModulePass(me, admin.user.id, project.moduleId)).toMatchObject({ ok: false, status: 400 });
    expect(await markVerified(me, admin.user.id)).toMatchObject({ ok: false, status: 400 });
  });
});

describe("deleting an account", () => {
  it("lets go of the address: no admin notices about it, and the audit log keeps the action but not the email", async () => {
    const admin = await person("scrub-admin", { role: "SUPER_ADMIN" });
    const learner = await person("scrub-learner");
    const submission = await pending(learner.user.id);
    // The notices notifySignup and notifySubmission write, addressed only to this test's admin
    await prisma.adminNotification.createMany({
      data: [
        { recipientId: admin.user.id, kind: "signup", title: `New sign-up: ${learner.user.name}`, body: `${learner.user.email} · email sign-up`, href: `/admin/users/${learner.user.id}` },
        { recipientId: admin.user.id, kind: "submission", title: `Capstone handed in: ${project.title}`, body: `${learner.user.name} · waiting for review`, href: `/admin/projects/${submission.id}/evaluate` },
      ],
    });
    const me = { id: admin.user.id, email: admin.user.email };
    await suspendUser(me, learner.user.id, "spam");
    await unsuspendUser(me, learner.user.id);

    session.userId = learner.user.id;
    expect((await deleteMe()).status).toBe(200);

    expect(await prisma.adminNotification.count({ where: { recipientId: admin.user.id } })).toBe(0);
    const log = await prisma.adminAction.findMany({ where: { targetId: learner.user.id } });
    expect(log.map((l) => l.action).sort()).toEqual(["user.suspend", "user.unsuspend"]);
    expect(log.every((l) => l.targetLabel === "Deleted account")).toBe(true);
    expect(JSON.stringify(log)).not.toContain(learner.user.email);
  });

  it("won't delete the last super admin's account", async () => {
    const only = await person("last-super", { role: "SUPER_ADMIN" });
    superAdmins.others = 0;
    session.userId = only.user.id;
    const res = await deleteMe();
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toMatch(/another account a super admin/);
    expect(await prisma.user.findUnique({ where: { id: only.user.id } })).not.toBeNull();
  });
});
