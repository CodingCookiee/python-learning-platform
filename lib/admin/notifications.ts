import { prisma } from "@/lib/prisma";

/**
 * Notices for admins only: a new sign-up, a capstone handed in. One row per admin, so each has their
 * own unread state. Sending is best-effort: a notice that fails to save never fails the sign-up or
 * the hand-in that caused it.
 */

export type NotificationKind = "signup" | "submission";

export interface AdminNotice {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
}

export async function notifyAdmins(notice: {
  kind: NotificationKind;
  title: string;
  body?: string;
  href: string;
}): Promise<void> {
  try {
    // A sign-up links to the account, which only super admins manage; a submission is for every admin
    const roles = notice.kind === "signup" ? (["SUPER_ADMIN"] as const) : (["ADMIN", "SUPER_ADMIN"] as const);
    const admins = await prisma.user.findMany({
      where: { role: { in: [...roles] }, suspendedAt: null },
      select: { id: true },
    });
    if (admins.length === 0) return;
    await prisma.adminNotification.createMany({
      data: admins.map((a) => ({
        recipientId: a.id,
        kind: notice.kind,
        title: notice.title,
        body: notice.body ?? "",
        href: notice.href,
      })),
    });
  } catch (error) {
    console.error("Admin notification failed:", error instanceof Error ? error.message : error);
  }
}

/** A new account, from the sign-up form or a first GitHub/Google sign-in */
export function notifySignup(
  user: { id: string; name: string | null; email: string },
  via: string
) {
  return notifyAdmins({
    kind: "signup",
    title: `New sign-up: ${user.name || user.email}`,
    body: `${user.email} · ${via}`,
    href: `/admin/users/${user.id}`,
  });
}

/** A capstone handed in for the examiner */
export function notifySubmission(
  submission: { id: string },
  learner: { name: string | null; email: string },
  project: { title: string }
) {
  return notifyAdmins({
    kind: "submission",
    title: `Capstone handed in: ${project.title}`,
    body: `${learner.name || learner.email} · waiting for review`,
    href: `/admin/projects/${submission.id}/evaluate`,
  });
}

export async function unreadCount(adminId: string): Promise<number> {
  return prisma.adminNotification.count({ where: { recipientId: adminId, readAt: null } });
}

export async function listNotifications(
  adminId: string,
  { take = 20, before }: { take?: number; before?: Date } = {}
): Promise<AdminNotice[]> {
  const rows = await prisma.adminNotification.findMany({
    where: { recipientId: adminId, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((n) => ({
    id: n.id,
    kind: n.kind as NotificationKind,
    title: n.title,
    body: n.body,
    href: n.href,
    createdAt: n.createdAt.toISOString(),
    read: n.readAt !== null,
  }));
}

/** Mark some (or, with no ids, all) of this admin's notices read */
export async function markRead(adminId: string, ids?: string[]): Promise<number> {
  const { count } = await prisma.adminNotification.updateMany({
    where: { recipientId: adminId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  return count;
}
