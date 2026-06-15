import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin, AuthContext } from "@/lib/api-auth";
import { invalidateCache } from "@/lib/cache";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  phase: z.string().min(1).optional(),
  duration: z.number().int().min(1).optional(),
});

export const PATCH = withAdmin(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as unknown;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
    const updatedModule = await prisma.module.update({ where: { id }, data: parsed.data });
    await invalidateCache("module:*");
    await invalidateCache("modules:*");
    return NextResponse.json({ module: updatedModule });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
});

export const DELETE = withAdmin(async (_req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    await prisma.module.delete({ where: { id } });
    await invalidateCache("module:*");
    await invalidateCache("modules:*");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete module" }, { status: 500 });
  }
});
