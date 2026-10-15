import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withSuperAdmin, type AuthContext } from "@/lib/api-auth";
import { unblockAddress } from "@/lib/admin/actions";

const schema = z.object({ email: z.string().trim().min(3).max(320) });

/**
 * POST /api/admin/blocked-emails { email }
 * Lifts the sign-up block on an address a super admin deleted. The block is stored as a fingerprint,
 * so it can only be found by typing the address in.
 */
export const POST = withSuperAdmin(async (req: NextRequest, context: AuthContext) => {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type the full email address." }, { status: 400 });
  const me = await prisma.user.findUnique({
    where: { id: context.userId },
    select: { id: true, email: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await unblockAddress(me, parsed.data.email);
  return result.ok
    ? NextResponse.json({ message: result.message })
    : NextResponse.json({ error: result.error }, { status: result.status });
});
