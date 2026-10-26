import { prisma } from "@/lib/prisma";
import { validTimeZone } from "@/lib/day";

/** The learner's time zone as their browser last reported it (lib/day.ts falls back to UTC on null) */
export async function learnerTimeZone(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  return user?.timeZone ?? null;
}

/** Save the zone the browser reports, when it's a real one and has changed. Returns the zone in use. */
export async function rememberTimeZone(userId: string, reported: unknown, saved: string | null): Promise<string | null> {
  const zone = validTimeZone(reported);
  if (!zone || zone === saved) return saved;
  await prisma.user.update({ where: { id: userId }, data: { timeZone: zone } });
  return zone;
}
