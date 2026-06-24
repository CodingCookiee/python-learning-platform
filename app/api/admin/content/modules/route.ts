import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api-auth";
import { getModuleDisplayDuration } from "@/lib/module-duration";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  phase: z.string().min(1),
  duration: z.number().int().min(1),
});

export const GET = withAdmin(async () => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { lessons: true, projects: true } } },
    });
    return NextResponse.json({
      modules: modules.map((module) => ({
        ...module,
        duration: getModuleDisplayDuration(module.title, module.duration),
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
});

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = (await req.json()) as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
    const maxOrder = await prisma.module.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const createdModule = await prisma.module.create({
      data: { ...parsed.data, order: (maxOrder?.order ?? 0) + 1 },
    });
    return NextResponse.json({ module: createdModule }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
});
