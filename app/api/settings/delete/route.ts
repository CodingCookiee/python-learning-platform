import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import { revokeTokensFor } from "@/lib/auth-tokens";
import { otherActiveSuperAdmins } from "@/lib/admin/actions";
import { forgetAccount } from "@/lib/admin/forget-account";

export const DELETE = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    // The site always keeps someone with full control. Without this, deleting the last super admin
    // would leave no admin at all, and the next sign-in as ADMIN_BOOTSTRAP_EMAIL would take over
    const me = await prisma.user.findUnique({ where: { id: context.userId }, select: { role: true } });
    if (me?.role === "SUPER_ADMIN" && (await otherActiveSuperAdmins(context.userId)) === 0) {
      return NextResponse.json(
        { error: "You're the last super admin. Make another account a super admin first, then delete this one." },
        { status: 409 }
      );
    }

    await invalidateUserCache(context.userId);
    // Admins' notices about the account go, and the audit log forgets who it was (lib/admin/forget-account.ts)
    await forgetAccount(context.userId);
    const deleted = await prisma.user.delete({
      where: { id: context.userId },
      select: { email: true },
    });
    // Confirmation and reset links already sent for the address die with the account
    await revokeTokensFor(deleted.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
});
