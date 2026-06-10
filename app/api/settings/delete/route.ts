import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";

export const DELETE = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    await invalidateUserCache(context.userId);
    await prisma.user.delete({ where: { id: context.userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
});
