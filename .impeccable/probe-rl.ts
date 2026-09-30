import "dotenv/config";
import { rateLimit } from "../lib/rate-limit";
async function main() {
  const who = `probe-${Date.now()}`;
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await rateLimit("emailSend", who));
  console.log(results.map((r) => `${r.ok ? "ok" : "BLOCKED"}(${r.remaining}, retry ${r.retryAfter}s)`).join(" "));
  console.log(results.slice(0, 3).every((r) => r.ok) && !results[3]!.ok ? "RATE LIMIT OK" : "RATE LIMIT WRONG");
}
main().finally(() => process.exit());
