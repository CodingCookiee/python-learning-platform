import "dotenv/config";
import { prisma } from "../lib/prisma";
import { getCurrentWeek } from "../lib/learning-log";
async function main() {
  const u = await prisma.user.findUniqueOrThrow({ where: { email: "five-probe@example.invalid" } });
  const w = await getCurrentWeek(u.id);
  console.log(w.saved && w.learned === "via the button" ? "SAVED WEEK READS BACK" : "WRONG", w.saved, w.learned, w.phase);
}
main().finally(() => process.exit());
