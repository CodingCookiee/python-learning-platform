import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  image: z.string().url().optional().nullable(),
});

/** PATCH /api/profile ? update display name and/or avatar URL */
export const PATCH = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const body = (await req.json()) as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const updated = await prisma.user.update({
      where: { id: context.userId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.image !== undefined ? { image: parsed.data.image } : {}),
      },
      select: { id: true, name: true, email: true, image: true, xp: true, level: true },
    });
    await invalidateUserCache(context.userId);
    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
});

/** GET /api/profile ? get current user profile */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        xp: true,
        level: true,
        createdAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
});
