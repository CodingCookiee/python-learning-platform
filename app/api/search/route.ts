import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";

export interface SearchResult {
  id: string;
  type: "module" | "lesson" | "exercise";
  title: string;
  description: string;
  href: string;
  moduleTitle?: string;
}

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ results: [] });

    const lower = q.toLowerCase();

    const [modules, lessons, exercises] = await Promise.all([
      prisma.module.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, description: true },
        take: 5,
      }),
      prisma.lesson.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, description: true, module: { select: { title: true } } },
        take: 5,
      }),
      prisma.exercise.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, description: true, lesson: { select: { title: true } } },
        take: 5,
      }),
    ]);

    const results: SearchResult[] = [
      ...modules.map((m) => ({
        id: m.id,
        type: "module" as const,
        title: m.title,
        description: m.description.slice(0, 100),
        href: "/modules/" + m.id,
      })),
      ...lessons.map((l) => ({
        id: l.id,
        type: "lesson" as const,
        title: l.title,
        description: l.description.slice(0, 100),
        href: "/lessons/" + l.id,
        moduleTitle: l.module.title,
      })),
      ...exercises.map((e) => ({
        id: e.id,
        type: "exercise" as const,
        title: e.title,
        description: e.description.slice(0, 100),
        href: "/exercises/" + e.id,
        moduleTitle: e.lesson.title,
      })),
    ];

    // Simple relevance: exact title match comes first
    results.sort((a, b) => {
      const aExact =
        a.title.toLowerCase() === lower ? 0 : a.title.toLowerCase().startsWith(lower) ? 1 : 2;
      const bExact =
        b.title.toLowerCase() === lower ? 0 : b.title.toLowerCase().startsWith(lower) ? 1 : 2;
      return aExact - bExact;
    });

    return NextResponse.json({ results: results.slice(0, 12) });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
});
