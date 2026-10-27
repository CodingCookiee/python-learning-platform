// The reading pace against the real Upstash (the .env's): different pages count, reopened ones don't,
// and past the hourly pace new pages are refused while opened ones still open. Keys expire within the hour.
import "dotenv/config";
import { LIMITS, distinctLimit } from "../lib/rate-limit";

async function main() {
  const who = `probe-reading-${Date.now()}`;
  const limit = LIMITS.contentRead.limit;
  const results = [];
  for (let i = 0; i < limit; i++) results.push(await distinctLimit("contentRead", who, `p${i}`));
  const again = await distinctLimit("contentRead", who, "p0");
  const over = await distinctLimit("contentRead", who, "new");
  const overAgain = await distinctLimit("contentRead", who, "new");
  const good =
    results.every((r) => r.ok) && results.at(-1)!.remaining === 0 && again.ok && !over.ok && !overAgain.ok;
  console.log(`opened ${limit}: all ok=${results.every((r) => r.ok)}; reopen ok=${again.ok}; new refused=${!over.ok} (retry ${over.retryAfter}s)`);
  console.log(good ? "READING PACE OK" : "READING PACE WRONG");
}
main().finally(() => process.exit());
