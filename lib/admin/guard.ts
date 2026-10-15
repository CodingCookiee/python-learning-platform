import { redirect } from "next/navigation";
import { adminLevel, type AdminLevel } from "@/lib/admin/levels";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * For admin pages: the signed-in admin, or a redirect (sign-in, a cleared stale session, or the
 * dashboard for anyone who isn't an admin). Checked against the database, not the session's role.
 */
export async function requireAdminPage(need: AdminLevel = "super"): Promise<{
  id: string;
  email: string;
  name: string | null;
  level: AdminLevel;
}> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, suspendedAt: true },
  });
  if (!me) redirect("/auth/session-ended");
  if (me.suspendedAt) redirect("/auth/session-ended?reason=suspended");
  const level = adminLevel(me.role);
  if (!level) redirect("/dashboard");
  // A regular admin asking for a super admin's page goes to the overview instead
  if (need === "super" && level !== "super") redirect("/admin");
  return { id: me.id, email: me.email, name: me.name, level };
}
