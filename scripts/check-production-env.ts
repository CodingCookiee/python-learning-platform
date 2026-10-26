/**
 * Runs in Vercel's production build (vercel.json), before anything touches the database.
 *
 * instrumentation.ts makes the same check when a server starts, but Next.js skips instrumentation
 * during `next build`. So a deploy with an unsafe setting would build, go live, and then fail every
 * request. Here it fails the build instead, and the live site stays on the last good deploy.
 * Missing launch settings are only listed, as at startup.
 */
import { productionProblems } from "../lib/env";

const { fatal, missing } = productionProblems();
for (const line of missing) console.warn(`[pylearn] Missing production setting: ${line}`);
if (fatal.length > 0) {
  console.error(`[pylearn] Unsafe production settings, so this deploy stops here:\n- ${fatal.join("\n- ")}`);
  process.exit(1);
}
console.log("[pylearn] Production settings checked.");
