import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { withSuperAdmin } from "@/lib/api-auth";

/**
 * POST /api/admin/content/refresh
 * The public pages (landing, About) read the syllabus through a cache tagged "content" that refreshes
 * hourly. After `npm run content:sync`, this expires it now, so the next visit reads the new content.
 */
export const POST = withSuperAdmin(async () => {
  revalidateTag("content", { expire: 0 });
  return NextResponse.json({ refreshed: true });
});
