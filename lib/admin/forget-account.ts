import { prisma } from "@/lib/prisma";

/** What the audit log says in place of a deleted account's name and address */
export const DELETED_ACCOUNT_LABEL = "Deleted account";

/**
 * Lets go of an account's name and address in the admin records, before the account itself is
 * deleted (its submissions go with it, and they're needed here to find their notices). The privacy
 * page promises that deleting an account deletes what's attached to it, and that a barred address
 * is kept only as a fingerprint:
 * - admins' notices about it (its sign-up and its capstone hand-ins, which name it) are deleted;
 * - the audit log keeps every action that touched it, or that it took as an admin, but not who it was.
 */
export async function forgetAccount(userId: string): Promise<void> {
  const submissions = await prisma.projectSubmission.findMany({ where: { userId }, select: { id: true } });
  await prisma.$transaction([
    prisma.adminNotification.deleteMany({
      where: {
        href: { in: [`/admin/users/${userId}`, ...submissions.map((s) => `/admin/projects/${s.id}/evaluate`)] },
      },
    }),
    prisma.adminAction.updateMany({ where: { targetId: userId }, data: { targetLabel: DELETED_ACCOUNT_LABEL } }),
    prisma.adminAction.updateMany({ where: { adminId: userId }, data: { adminEmail: DELETED_ACCOUNT_LABEL } }),
  ]);
}
