/**
 * Runs once when a server instance starts. In production it refuses settings that aren't safe yet
 * and lists launch settings that are missing (lib/env.ts, productionProblems).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { productionProblems } = await import("@/lib/env");
  const { fatal, missing } = productionProblems();
  for (const line of missing) console.error(`[pylearn] Missing production setting: ${line}`);
  if (fatal.length > 0)
    throw new Error(`[pylearn] Unsafe production settings:\n- ${fatal.join("\n- ")}`);
}
