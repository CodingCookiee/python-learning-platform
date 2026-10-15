import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin, type AuthContext } from "@/lib/api-auth";
import { listNotifications, markRead, unreadCount } from "@/lib/admin/notifications";

/**
 * GET /api/admin/notifications            the admin's latest notices and unread count
 * GET /api/admin/notifications?count=1    the unread count only (the bell polls this)
 * POST /api/admin/notifications { ids? }  mark these read, or all of them without ids
 */
export const GET = withAdmin(async (req: NextRequest, context: AuthContext) => {
  const unread = await unreadCount(context.userId);
  if (req.nextUrl.searchParams.get("count"))
    return NextResponse.json({ unread }, { headers: { "cache-control": "no-store" } });
  const items = await listNotifications(context.userId, { take: 12 });
  return NextResponse.json({ unread, items }, { headers: { "cache-control": "no-store" } });
});

const readSchema = z.object({ ids: z.array(z.string().min(1).max(64)).max(200).optional() });

export const POST = withAdmin(async (req: NextRequest, context: AuthContext) => {
  const parsed = readSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await markRead(context.userId, parsed.data.ids);
  return NextResponse.json({ unread: await unreadCount(context.userId) });
});
