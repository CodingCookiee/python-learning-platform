import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { checkAndUnlockAchievements } from "@/lib/achievements";
import { issueToken, revokeTokensFor } from "@/lib/auth-tokens";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { CHECKPOINT_RETRY_MINUTES } from "@/lib/mastery-rules";
import { invalidateUserCache } from "@/lib/cache";
import { blockEmail, unblockEmail } from "@/lib/admin/blocked-emails";
import { normalizeEmail } from "@/lib/email-address";

/**
 * What an admin can do to an account, a learner's progress or a certificate. Every action checks its
 * guards, does one thing, and writes one row to the audit log (AdminAction), so an admin's power is
 * always on the record. Callers have already checked the caller is an admin (withAdmin).
 */

export interface Admin {
  id: string;
  email: string;
}

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; status: 400 | 403 | 404 | 409 | 503; error: string };

const fail = (status: 400 | 403 | 404 | 409 | 503, error: string): ActionResult => ({
  ok: false,
  status,
  error,
});

async function target(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspendedAt: true,
      emailVerified: true,
    },
  });
}

function label(user: { name: string | null; email: string }): string {
  return user.name ? `${user.name} <${user.email}>` : user.email;
}

async function log(
  admin: Admin,
  action: string,
  targetId: string | null,
  targetLabel: string,
  detail?: Prisma.InputJsonValue
) {
  await prisma.adminAction.create({
    data: {
      adminId: admin.id,
      adminEmail: admin.email,
      action,
      targetId,
      targetLabel,
      detail: detail ?? undefined,
    },
  });
}

/** Other admins who aren't suspended: an account can't take away the last of them */
/** Other super admins who aren't suspended: the site can't lose the last of them */
async function otherActiveSuperAdmins(exceptId: string): Promise<number> {
  return prisma.user.count({ where: { role: "SUPER_ADMIN", suspendedAt: null, id: { not: exceptId } } });
}

// Accounts

export async function suspendUser(
  admin: Admin,
  userId: string,
  reason: string
): Promise<ActionResult> {
  if (userId === admin.id) return fail(400, "You can't suspend your own account.");
  const user = await target(userId);
  if (!user) return fail(404, "No such account.");
  if (user.suspendedAt) return fail(409, "This account is already suspended.");
  if (user.role === "SUPER_ADMIN" && (await otherActiveSuperAdmins(userId)) === 0)
    return fail(409, "That's the last active super admin.");
  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: new Date(), suspendedReason: reason || null },
  });
  await log(admin, "user.suspend", userId, label(user), { reason });
  return { ok: true, message: "Suspended. They can't sign in or use pylearn until you lift it." };
}

export async function unsuspendUser(admin: Admin, userId: string): Promise<ActionResult> {
  const user = await target(userId);
  if (!user) return fail(404, "No such account.");
  if (!user.suspendedAt) return fail(409, "This account isn't suspended.");
  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: null, suspendedReason: null },
  });
  await log(admin, "user.unsuspend", userId, label(user));
  return { ok: true, message: "Suspension lifted. They can sign in again." };
}

export async function deleteUser(
  admin: Admin,
  userId: string,
  confirmEmail: string,
  /** Bar the address from signing up again (a keyed fingerprint is kept, not the address) */
  block = false
): Promise<ActionResult> {
  if (userId === admin.id)
    return fail(400, "You can't delete your own account here; use Settings.");
  const user = await target(userId);
  if (!user) return fail(404, "No such account.");
  // Typing the address back is the confirmation: a deletion can't be undone
  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase())
    return fail(400, "Type the account's email address to confirm.");
  if (user.role === "SUPER_ADMIN" && (await otherActiveSuperAdmins(userId)) === 0)
    return fail(409, "That's the last active super admin.");
  await prisma.user.delete({ where: { id: userId } });
  // Confirmation and reset links already sent for the address die with the account
  await revokeTokensFor(user.email);
  if (block) await blockEmail(user.email, admin.id);
  await log(admin, "user.delete", userId, label(user), { blocked: block });
  return {
    ok: true,
    message: block
      ? "Deleted, with everything in the account. The address can't sign up again."
      : "Deleted, with everything in the account.",
  };
}

/** Lets a blocked address sign up again (the block is found by the address typed in) */
export async function unblockAddress(admin: Admin, email: string): Promise<ActionResult> {
  const address = normalizeEmail(email);
  if (!address.includes("@")) return fail(400, "Type the full email address.");
  if (!(await unblockEmail(address))) return fail(404, "That address isn't blocked.");
  await log(admin, "user.unblock-email", null, address);
  return { ok: true, message: `${address} can sign up again.` };
}

const ROLE_WORDS: Record<"LEARNER" | "ADMIN" | "SUPER_ADMIN", string> = {
  LEARNER: "a learner",
  ADMIN: "an admin (reviews submissions)",
  SUPER_ADMIN: "a super admin (full control)",
};

export async function setRole(
  admin: Admin,
  userId: string,
  role: "LEARNER" | "ADMIN" | "SUPER_ADMIN"
): Promise<ActionResult> {
  if (userId === admin.id) return fail(400, "You can't change your own role; another super admin can.");
  const user = await target(userId);
  if (!user) return fail(404, "No such account.");
  if (user.role === role) return fail(409, `They're already ${ROLE_WORDS[role]}.`);
  if (role !== "LEARNER" && !user.emailVerified)
    return fail(409, "Confirm their email first: only a verified address can be an admin.");
  if (user.role === "SUPER_ADMIN" && (await otherActiveSuperAdmins(userId)) === 0)
    return fail(409, "That's the last active super admin.");
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await log(admin, "user.role", userId, label(user), { from: user.role, to: role });
  return { ok: true, message: `They're ${ROLE_WORDS[role]} now.` };
}

export async function markVerified(admin: Admin, userId: string): Promise<ActionResult> {
  const user = await target(userId);
  if (!user) return fail(404, "No such account.");
  if (user.emailVerified) return fail(409, "Their email is already confirmed.");
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  await log(admin, "user.verify", userId, label(user));
  return { ok: true, message: "Email marked as confirmed. They can sign in." };
}

export async function sendResetLink(admin: Admin, userId: string): Promise<ActionResult> {
  if (!isEmailConfigured())
    return fail(503, "Email isn't set up on this server, so no link can be sent.");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, password: true },
  });
  if (!user) return fail(404, "No such account.");
  if (!user.password)
    return fail(409, "This account signs in with GitHub or Google; it has no password to reset.");
  const sent = await sendPasswordResetEmail(user.email, await issueToken("reset", user.email));
  if (!sent) return fail(503, "The email didn't send. Try again in a moment.");
  await log(admin, "user.reset-link", userId, label(user));
  return {
    ok: true,
    message: `A reset link is on its way to ${user.email}. It works for an hour.`,
  };
}

// Progress

async function moduleFor(moduleId: string) {
  return prisma.module.findFirst({
    where: { id: moduleId, archivedAt: null },
    select: { id: true, title: true, order: true, track: { select: { slug: true } } },
  });
}

const moduleLabel = (m: { title: string; order: number; track: { slug: string } | null }) =>
  `${m.track?.slug === "automation" ? "Automation" : "Python"} module ${m.order}: ${m.title}`;

/** Passing attempts that count for this module: its own gradings, and belt test-outs that cover it */
function passesOf(userId: string, moduleId: string) {
  return prisma.checkpointAttempt.findMany({
    where: {
      userId,
      passed: true,
      OR: [
        { moduleId, coversModuleIds: { isEmpty: true } },
        { coversModuleIds: { has: moduleId } },
      ],
    },
    select: { id: true, coversModuleIds: true },
  });
}

/** Pass a module for a learner without a grading, e.g. after checking their work another way */
export async function grantModulePass(
  admin: Admin,
  userId: string,
  moduleId: string
): Promise<ActionResult> {
  const [user, mod] = await Promise.all([target(userId), moduleFor(moduleId)]);
  if (!user) return fail(404, "No such account.");
  if (!mod) return fail(404, "No such module.");
  if ((await passesOf(userId, moduleId)).length > 0)
    return fail(409, "They've already passed this module.");
  await prisma.checkpointAttempt.create({
    data: {
      userId,
      moduleId,
      exerciseIds: [],
      passedIds: [],
      placement: true,
      score: 1,
      passed: true,
      submittedAt: new Date(),
      grantedById: admin.id,
    },
  });
  // A pass can complete a belt: its patch arrives as it would from a grading (no grading XP: nothing was sat)
  await checkAndUnlockAchievements(userId);
  await invalidateUserCache(userId);
  await log(admin, "module.grant", userId, label(user), { moduleId, module: moduleLabel(mod) });
  return { ok: true, message: `${moduleLabel(mod)} is passed for them.` };
}

/** Take a module pass away. Modules after it lock again until it's passed, as they would have */
export async function revokeModulePass(
  admin: Admin,
  userId: string,
  moduleId: string
): Promise<ActionResult> {
  const [user, mod] = await Promise.all([target(userId), moduleFor(moduleId)]);
  if (!user) return fail(404, "No such account.");
  if (!mod) return fail(404, "No such module.");
  const passes = await passesOf(userId, moduleId);
  if (passes.length === 0) return fail(409, "They haven't passed this module.");
  for (const attempt of passes) {
    const rest = attempt.coversModuleIds.filter((id) => id !== moduleId);
    // A module's own grading goes; a belt test-out keeps the other modules it passed
    if (attempt.coversModuleIds.length === 0 || rest.length === 0) {
      await prisma.checkpointAttempt.delete({ where: { id: attempt.id } });
    } else {
      await prisma.checkpointAttempt.update({
        where: { id: attempt.id },
        data: { coversModuleIds: rest },
      });
    }
  }
  await invalidateUserCache(userId);
  await log(admin, "module.revoke", userId, label(user), { moduleId, module: moduleLabel(mod) });
  return { ok: true, message: `${moduleLabel(mod)} is no longer passed for them.` };
}

/** Let a learner retry a module's grading (or its belt's test-out) now rather than after the wait */
export async function clearGradingCooldown(
  admin: Admin,
  userId: string,
  moduleId: string
): Promise<ActionResult> {
  const [user, mod] = await Promise.all([target(userId), moduleFor(moduleId)]);
  if (!user) return fail(404, "No such account.");
  if (!mod) return fail(404, "No such module.");
  const waitStart = new Date(Date.now() - CHECKPOINT_RETRY_MINUTES * 60_000);
  const cooling = await prisma.checkpointAttempt.findMany({
    where: {
      userId,
      passed: false,
      submittedAt: { gt: waitStart },
      OR: [{ moduleId }, { coversModuleIds: { has: moduleId } }],
    },
    select: { id: true },
  });
  if (cooling.length === 0) return fail(409, "There's no wait on this module's grading.");
  // The failed attempts stay on record; they're dated back just past the wait
  await prisma.checkpointAttempt.updateMany({
    where: { id: { in: cooling.map((c) => c.id) } },
    data: { submittedAt: new Date(waitStart.getTime() - 1000) },
  });
  await log(admin, "grading.clear-cooldown", userId, label(user), {
    moduleId,
    module: moduleLabel(mod),
  });
  return { ok: true, message: "They can take a fresh grading now." };
}

// Certificates

export async function revokeCertificate(
  admin: Admin,
  code: string,
  reason: string
): Promise<ActionResult> {
  const cert = await prisma.certificate.findUnique({
    where: { code },
    select: {
      code: true,
      revokedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!cert) return fail(404, "No certificate with that ID.");
  if (cert.revokedAt) return fail(409, "It's already revoked.");
  await prisma.certificate.update({
    where: { code },
    data: { revokedAt: new Date(), revokedReason: reason || null },
  });
  await log(admin, "certificate.revoke", cert.user.id, label(cert.user), { code, reason });
  return {
    ok: true,
    message: "Revoked. Its page and image no longer exist, and they can't restore it.",
  };
}

export async function reinstateCertificate(admin: Admin, code: string): Promise<ActionResult> {
  const cert = await prisma.certificate.findUnique({
    where: { code },
    select: {
      code: true,
      revokedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!cert) return fail(404, "No certificate with that ID.");
  if (!cert.revokedAt) return fail(409, "It isn't revoked.");
  await prisma.certificate.update({
    where: { code },
    data: { revokedAt: null, revokedReason: null },
  });
  await log(admin, "certificate.reinstate", cert.user.id, label(cert.user), { code });
  return { ok: true, message: "Reinstated. Its page is back, unless they withdrew it themselves." };
}
