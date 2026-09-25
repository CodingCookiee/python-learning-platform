import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api-auth";

/**
 * GET /api/admin/content/modules
 * Read-only listing of live modules across tracks. Content is edited as files
 * in content/ and synced with `npm run content:sync`, so there is no write API.
 */
export const GET = withAdmin(async () => {
  try {
    const modules = await prisma.module.findMany({
      where: { archivedAt: null, trackId: { not: null } },
      orderBy: [{ track: { order: "asc" } }, { order: "asc" }],
      include: {
        _count: {
          select: {
            lessons: { where: { archivedAt: null } },
            projects: { where: { archivedAt: null } },
          },
        },
      },
    });
    return NextResponse.json({ modules });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
});
