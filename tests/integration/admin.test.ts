import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import * as actions from "@/lib/admin/actions";
import { listNotifications, markRead, notifySignup, unreadCount } from "@/lib/admin/notifications";
import { getUserRecord, listUsers } from "@/lib/admin/users";
import { getCurriculumState } from "@/lib/curriculum-state";
import { getCheckpointSummary } from "@/lib/checkpoint";
import { getCertificateForViewer, updateCertificate } from "@/lib/certificates";
import { newCertificateCode } from "@/lib/certificate-rules";
import { CHECKPOINT_RETRY_MINUTES } from "@/lib/mastery-rules";
import { isEmailBlocked } from "@/lib/admin/blocked-emails";
import { consumeToken, issueToken } from "@/lib/auth-tokens";
import { POST as confirmEmail } from "@/app/api/auth/verify/route";
import { makeLearner } from "./helpers";

let admin: Awaited<ReturnType<typeof makeLearner>>;
let learner: Awaited<ReturnType<typeof makeLearner>>;
let me: actions.Admin;

beforeAll(async () => {
  admin = await makeLearner("admin-test", { role: "SUPER_ADMIN" });
  learner = await makeLearner("admin-target");
  me = { id: admin.user.id, email: admin.user.email };
});
afterAll(async () => {
  await learner.cleanup();
  await admin.cleanup();
  await prisma.adminAction.deleteMany({ where: { adminId: me.id } });
  await prisma.blockedEmail.deleteMany({ where: { blockedById: me.id } });
});

const lastAction = () => prisma.adminAction.findFirst({ where: { adminId: me.id }, orderBy: { createdAt: "desc" } });

describe("account actions", () => {
  it("suspend and lift a suspension, each on the record", async () => {
    expect(await actions.suspendUser(me, learner.user.id, "spam")).toMatchObject({ ok: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } })).suspendedAt).toBeInstanceOf(Date);
    expect(await lastAction()).toMatchObject({ action: "user.suspend", targetId: learner.user.id, detail: { reason: "spam" } });
    expect(await actions.suspendUser(me, learner.user.id, "")).toMatchObject({ ok: false, status: 409 });

    expect(await actions.unsuspendUser(me, learner.user.id)).toMatchObject({ ok: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } })).suspendedAt).toBeNull();
  });

  it("won't let an admin suspend, demote or delete themselves", async () => {
    expect(await actions.suspendUser(me, me.id, "")).toMatchObject({ ok: false, status: 400 });
    expect(await actions.setRole(me, me.id, "LEARNER")).toMatchObject({ ok: false, status: 400 });
    expect(await actions.deleteUser(me, me.id, me.email)).toMatchObject({ ok: false, status: 400 });
  });

  it("only make a verified address an admin, at either level", async () => {
    const unverified = await makeLearner("admin-unverified", { emailVerified: null });
    try {
      expect(await actions.setRole(me, unverified.user.id, "ADMIN")).toMatchObject({ ok: false, status: 409 });
      expect(await actions.markVerified(me, unverified.user.id)).toMatchObject({ ok: true });
      expect(await actions.setRole(me, unverified.user.id, "ADMIN")).toMatchObject({ ok: true });
      expect((await prisma.user.findUniqueOrThrow({ where: { id: unverified.user.id } })).role).toBe("ADMIN");
      expect(await actions.setRole(me, unverified.user.id, "SUPER_ADMIN")).toMatchObject({ ok: true });
      expect(await actions.setRole(me, unverified.user.id, "LEARNER")).toMatchObject({ ok: true });
      expect(await lastAction()).toMatchObject({ action: "user.role", detail: { from: "SUPER_ADMIN", to: "LEARNER" } });
    } finally {
      await unverified.cleanup();
    }
  });

  it("delete only when the email is typed back", async () => {
    const doomed = await makeLearner("admin-doomed");
    expect(await actions.deleteUser(me, doomed.user.id, "wrong@example.invalid")).toMatchObject({ ok: false, status: 400 });
    expect(await actions.deleteUser(me, doomed.user.id, doomed.user.email.toUpperCase())).toMatchObject({ ok: true });
    expect(await prisma.user.findUnique({ where: { id: doomed.user.id } })).toBeNull();
    // The record outlives the account
    expect(await lastAction()).toMatchObject({ action: "user.delete", targetId: doomed.user.id, targetLabel: expect.stringContaining(doomed.user.email) });
    // Not barred unless the admin asked
    expect(await isEmailBlocked(doomed.user.email)).toBe(false);
  });

  it("voids the address's confirmation and reset links with the account", async () => {
    const gone = await makeLearner("admin-links", { emailVerified: null });
    const verify = await issueToken("verify", gone.user.email);
    await issueToken("reset", gone.user.email);
    // A link kept from before (no revocation), to show the route itself refuses it
    const orphan = await issueToken("verify", `orphan-${gone.user.email}`);
    expect(await actions.deleteUser(me, gone.user.id, gone.user.email)).toMatchObject({ ok: true });
    const left = await prisma.verificationToken.count({
      where: { identifier: { in: [`verify:${gone.user.email}`, `reset:${gone.user.email}`] } },
    });
    expect(left).toBe(0);

    const post = (token: string) =>
      confirmEmail(new Request("http://localhost/api/auth/verify", { method: "POST", body: JSON.stringify({ token }) }));
    // The revoked link reads as used; a link with no account behind it says so, never "confirmed"
    expect((await post(verify)).status).toBe(400);
    const res = await post(orphan);
    expect(res.status).toBe(410);
    expect(((await res.json()) as { ok?: boolean }).ok).toBeUndefined();
  });

  it("lets a one-time link be used once, even by two requests at the same moment", async () => {
    const address = `admin-race-${Date.now()}@example.invalid`;
    const token = await issueToken("reset", address);
    const both = await Promise.all([consumeToken("reset", token), consumeToken("reset", token)]);
    expect(both.filter((r) => r === address)).toHaveLength(1);
  });

  it("can bar a deleted address from signing up again, keeping only a fingerprint, and lift it", async () => {
    const banned = await makeLearner("admin-banned");
    const address = banned.user.email;
    expect(await actions.deleteUser(me, banned.user.id, address, true)).toMatchObject({ ok: true });
    expect(await lastAction()).toMatchObject({ action: "user.delete", detail: { blocked: true } });
    // Matched however it's typed, and the address itself is nowhere in the table
    expect(await isEmailBlocked(` ${address.toUpperCase()} `)).toBe(true);
    const rows = await prisma.blockedEmail.findMany({ where: { blockedById: me.id } });
    expect(rows.some((r) => r.hash.includes(address) || r.hash.length !== 64)).toBe(false);

    expect(await actions.unblockAddress(me, address)).toMatchObject({ ok: true });
    expect(await isEmailBlocked(address)).toBe(false);
    expect(await actions.unblockAddress(me, address)).toMatchObject({ ok: false, status: 404 });
    expect(await lastAction()).toMatchObject({ action: "user.unblock-email" });
  });
});

describe("progress actions", () => {
  it("grant a module pass (marked granted), then revoke it", async () => {
    const m1 = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!.modules[0]!;
    expect(await actions.grantModulePass(me, learner.user.id, m1.id)).toMatchObject({ ok: true });
    let python = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!;
    expect(python.modules[0]!.passed).toBe(true);
    expect(python.modules[1]!.unlocked).toBe(true);
    const record = (await getUserRecord(learner.user.id))!;
    expect(record.tracks.find((t) => t.slug === "python")!.modules[0]).toMatchObject({ passed: true, granted: true });
    expect(await actions.grantModulePass(me, learner.user.id, m1.id)).toMatchObject({ ok: false, status: 409 });

    expect(await actions.revokeModulePass(me, learner.user.id, m1.id)).toMatchObject({ ok: true });
    python = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!;
    expect(python.modules[0]!.passed).toBe(false);
    expect(python.modules[1]!.unlocked).toBe(false);
  });

  it("revoke one module of a belt test-out and keep the others", async () => {
    const python = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!;
    const [a, b, c] = python.modules.slice(0, 3).map((m) => m.id);
    await prisma.checkpointAttempt.create({
      data: { userId: learner.user.id, moduleId: a!, belt: "white", coversModuleIds: [a!, b!, c!], exerciseIds: [], passedIds: [], placement: true, score: 1, passed: true, submittedAt: new Date() },
    });
    try {
      expect(await actions.revokeModulePass(me, learner.user.id, b!)).toMatchObject({ ok: true });
      const after = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!;
      // Module 2 is no longer passed; 1 and 3 keep their passes, and 3 waits behind 2 again
      expect(after.modules.slice(0, 3).map((m) => m.passed)).toEqual([true, false, true]);
      expect(after.modules[2]!.unlocked).toBe(false);
      expect(after.modulesPassed).toBe(1);
    } finally {
      await prisma.checkpointAttempt.deleteMany({ where: { userId: learner.user.id } });
    }
  });

  it("clear a grading's wait", async () => {
    const m1 = (await getCurriculumState(learner.user.id)).find((t) => t.slug === "python")!.modules[0]!;
    await prisma.checkpointAttempt.create({
      data: { userId: learner.user.id, moduleId: m1.id, exerciseIds: ["x"], passedIds: [], score: 0, passed: false, submittedAt: new Date() },
    });
    expect((await getCheckpointSummary(learner.user.id, m1.id))?.status).toBe("cooldown");
    expect(await actions.clearGradingCooldown(me, learner.user.id, m1.id)).toMatchObject({ ok: true });
    expect((await getCheckpointSummary(learner.user.id, m1.id))?.status).not.toBe("cooldown");
    expect(await actions.clearGradingCooldown(me, learner.user.id, m1.id)).toMatchObject({ ok: false, status: 409 });
    const kept = await prisma.checkpointAttempt.findFirstOrThrow({ where: { userId: learner.user.id, moduleId: m1.id } });
    expect(kept.submittedAt!.getTime()).toBeLessThan(Date.now() - CHECKPOINT_RETRY_MINUTES * 60_000);
    await prisma.checkpointAttempt.deleteMany({ where: { userId: learner.user.id } });
  });
});

describe("certificate actions", () => {
  it("revoke: the page is gone for everyone and the holder can't restore it", async () => {
    const cert = await prisma.certificate.create({
      data: { userId: learner.user.id, track: "python", name: "Ada Tester", code: newCertificateCode("python") },
    });
    expect(await getCertificateForViewer(cert.code, null)).not.toBeNull();
    expect(await actions.revokeCertificate(me, cert.code, "copied capstone")).toMatchObject({ ok: true });
    expect(await getCertificateForViewer(cert.code, null)).toBeNull();
    expect(await getCertificateForViewer(cert.code, learner.user.id)).toBeNull();
    expect(await updateCertificate(learner.user.id, cert.code, { withdrawn: false })).toMatchObject({ ok: false, status: 403 });

    expect(await actions.reinstateCertificate(me, cert.code)).toMatchObject({ ok: true });
    expect(await getCertificateForViewer(cert.code, null)).not.toBeNull();
    await prisma.certificate.delete({ where: { code: cert.code } });
  });
});

describe("admin notifications", () => {
  it("reach every admin, and each marks their own read", async () => {
    const before = await unreadCount(me.id);
    await notifySignup({ id: learner.user.id, name: "Ada Tester", email: learner.user.email }, "email sign-up");
    expect(await unreadCount(me.id)).toBe(before + 1);
    const [latest] = await listNotifications(me.id, { take: 1 });
    expect(latest).toMatchObject({ kind: "signup", title: "New sign-up: Ada Tester", href: `/admin/users/${learner.user.id}`, read: false });

    expect(await markRead(me.id, [latest!.id])).toBe(1);
    expect(await unreadCount(me.id)).toBe(before);
    await markRead(me.id);
    expect(await unreadCount(me.id)).toBe(0);
  });

  it("never go to learners", async () => {
    await notifySignup({ id: learner.user.id, name: null, email: learner.user.email }, "test");
    expect(await prisma.adminNotification.count({ where: { recipientId: learner.user.id } })).toBe(0);
  });
});

describe("admin levels", () => {
  it("send sign-ups to super admins only, and submissions to every admin", async () => {
    const regular = await makeLearner("admin-regular", { role: "ADMIN" });
    try {
      await notifySignup({ id: learner.user.id, name: null, email: learner.user.email }, "test");
      expect(await prisma.adminNotification.count({ where: { recipientId: regular.user.id } })).toBe(0);
      const { notifySubmission } = await import("@/lib/admin/notifications");
      await notifySubmission({ id: "sub-test" }, { name: "Ada", email: learner.user.email }, { title: "Receipt printer" });
      expect(await prisma.adminNotification.count({ where: { recipientId: regular.user.id, kind: "submission" } })).toBe(1);
    } finally {
      await regular.cleanup();
    }
  });


});

describe("the users list", () => {
  it("finds an account by part of its email, and filters", async () => {
    const found = await listUsers({ q: learner.user.email.slice(0, 18).toUpperCase() });
    expect(found.rows.map((r) => r.id)).toContain(learner.user.id);
    const admins = await listUsers({ filter: "admins", q: admin.user.email });
    expect(admins.rows.map((r) => r.id)).toEqual([admin.user.id]);
  });

  it("applies the filter and the search together (searching under Inactive lists only accounts not seen in a month)", async () => {
    await prisma.user.update({ where: { id: learner.user.id }, data: { lastSeenAt: new Date() } });
    const inactive = await listUsers({ filter: "inactive", q: learner.user.email });
    expect(inactive.rows.map((r) => r.id)).not.toContain(learner.user.id);
    await prisma.user.update({ where: { id: learner.user.id }, data: { lastSeenAt: new Date(Date.now() - 40 * 86_400_000) } });
    const nowInactive = await listUsers({ filter: "inactive", q: learner.user.email });
    expect(nowInactive.rows.map((r) => r.id)).toContain(learner.user.id);
  });

});
