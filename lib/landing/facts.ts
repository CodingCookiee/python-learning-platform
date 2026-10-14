import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Numbers the landing page states as fact (the FAQ's time answer), read from the content so they
 * stay true as modules change.
 */

export interface CourseHours {
  /** The Start here on-ramp */
  start: number;
  /** White belt to black belt */
  python: number;
  /** The AI automation dan grades */
  automation: number;
}

/** Hours of training per track: the sum of its modules' hours (`Module.duration`) */
export async function getCourseHours(): Promise<CourseHours> {
  const tracks = await prisma.track.findMany({
    where: { slug: { in: ["start", "python", "automation"] }, archivedAt: null },
    select: { slug: true, modules: { where: { archivedAt: null }, select: { duration: true } } },
  });
  const total = (slug: string) =>
    tracks.find((t) => t.slug === slug)?.modules.reduce((sum, m) => sum + m.duration, 0) ?? 0;
  return { start: total("start"), python: total("python"), automation: total("automation") };
}

const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const WEEKS_PER_MONTH = 52 / 12;

/** "roughly six months at 5 hours a week": how long `hours` of training takes at `perWeek` */
export function paceLine(hours: number, perWeek: number): string {
  const weeks = hours / perWeek;
  const months = Math.round(weeks / WEEKS_PER_MONTH);
  const years = Math.round(weeks / 52);
  const span =
    weeks <= 1.5
      ? "about a week"
      : weeks < 8
        ? `about ${Math.round(weeks)} weeks`
        : months <= 12 && weeks < 52 * 1.25
          ? months >= 12
            ? "roughly a year"
            : `roughly ${months === 1 ? "a month" : `${WORDS[months]} months`}`
          : `roughly ${years === 1 ? "a year" : `${WORDS[years] ?? years} years`}`;
  return `${span} at ${perWeek} ${perWeek === 1 ? "hour" : "hours"} a week`;
}

/**
 * Everything the landing page reads from the database, cached for an hour: it's the same for every
 * visitor and only changes with a content sync, so visits don't each wait on six queries (the slow
 * first byte an SEO crawl flagged). A sync shows within the hour, or at once after Refresh public
 * pages in Admin > Content (app/api/admin/content/refresh).
 */
export const getLandingData = unstable_cache(
  async () => {
    const [modules, lessonCount, achievements, achievementCount, hours, automationModules] = await Promise.all([
      prisma.module.findMany({
        where: { archivedAt: null, track: { slug: "python", archivedAt: null } },
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          duration: true,
          _count: { select: { lessons: { where: { archivedAt: null } } } },
        },
      }),
      prisma.lesson.count({
        where: { archivedAt: null, module: { archivedAt: null, track: { slug: "python", archivedAt: null } } },
      }),
      prisma.achievement.findMany({
        where: { archivedAt: null, tier: { in: ["Bronze", "Silver", "Gold"] } },
        orderBy: { xpReward: "asc" },
        select: { name: true, description: true },
        take: 3,
      }),
      prisma.achievement.count({ where: { archivedAt: null } }),
      getCourseHours(),
      prisma.module.findMany({
        where: { archivedAt: null, track: { slug: "automation", archivedAt: null } },
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          duration: true,
          _count: { select: { lessons: { where: { archivedAt: null } } } },
        },
      }),
    ]);
    return { modules, lessonCount, achievements, achievementCount, hours, automationModules };
  },
  ["landing-data"],
  { revalidate: 3600, tags: ["content"] }
);
