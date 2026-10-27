import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { BOT_MESSAGE } from "@/lib/bot-routes";

/**
 * Whether this request looks automated, by Vercel BotID: an invisible check, no puzzle for the learner.
 * The browser half (instrumentation-client.ts) signs the requests in lib/bot-routes.ts.
 *
 * Only on Vercel, which runs the check; local builds and tests skip it. BOT_CHECK=off turns it off there
 * too. If the check itself fails, the request goes through, as rate limits do in a Redis outage: an
 * outage shouldn't lock learners out.
 */
export async function looksAutomated(): Promise<boolean> {
  if (!process.env.VERCEL || process.env.BOT_CHECK === "off") return false;
  try {
    return (await checkBotId()).isBot;
  } catch (e) {
    console.warn("[bot-check] BotID unavailable, letting the request through:", (e as Error).message);
    return false;
  }
}

export function botRefused(): NextResponse {
  return NextResponse.json({ error: BOT_MESSAGE }, { status: 403 });
}
