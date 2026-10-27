import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const checkBotId = vi.fn();
vi.mock("botid/server", () => ({ checkBotId: () => checkBotId() }));

import { LIMITS, distinctLimit } from "@/lib/rate-limit";
import { readingTooFast, waitInWords } from "@/lib/reading-pace";
import { looksAutomated } from "@/lib/bot-check";
import { BOT_CHECKED } from "@/lib/bot-routes";

let n = 0;
const someone = () => `reader-${Date.now()}-${n++}`;

describe("reading pace", () => {
  it("counts different pages, so reopening or refreshing one is free", async () => {
    const who = someone();
    for (let i = 0; i < 5; i++) expect((await distinctLimit("contentRead", who, "lesson:a")).ok).toBe(true);
    const next = await distinctLimit("contentRead", who, "lesson:b");
    expect(next.remaining).toBe(LIMITS.contentRead.limit - 2);
  });

  it("pauses new pages past the hourly pace, but pages already opened still open", async () => {
    const who = someone();
    for (let i = 0; i < LIMITS.contentRead.limit; i++) {
      expect(await readingTooFast(who, `drill:${i}`)).toBeNull();
    }
    const refused = await readingTooFast(who, "drill:one-too-many");
    expect(refused?.ok).toBe(false);
    expect(refused?.retryAfter).toBeGreaterThan(0);
    // Work in progress goes on
    expect(await readingTooFast(who, "drill:0")).toBeNull();
    // The refused page wasn't counted as opened, so it stays refused
    expect(await readingTooFast(who, "drill:one-too-many")).not.toBeNull();
  });

  it("keeps each learner's count to themselves", async () => {
    const a = someone();
    for (let i = 0; i < LIMITS.contentRead.limit; i++) await readingTooFast(a, `lesson:${i}`);
    expect(await readingTooFast(a, "lesson:new")).not.toBeNull();
    expect(await readingTooFast(someone(), "lesson:new")).toBeNull();
  });

  it("sets paces a learner never reaches: more than a module's worth an hour, several a day", () => {
    expect(LIMITS.contentRead.limit).toBeGreaterThanOrEqual(60);
    expect(LIMITS.contentReadDay.limit).toBeGreaterThan(LIMITS.contentRead.limit);
  });

  it("says the wait in words", () => {
    expect(waitInWords(30)).toBe("a minute");
    expect(waitInWords(25 * 60)).toBe("25 minutes");
    expect(waitInWords(5 * 60 * 60)).toBe("5 hours");
  });
});

describe("bot check", () => {
  beforeEach(() => checkBotId.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("covers sign-up, password sign-in and both email-sending routes", () => {
    expect(BOT_CHECKED.map((r) => r.path)).toEqual([
      "/api/auth/register",
      "/api/auth/callback/credentials",
      "/api/auth/password/forgot",
      "/api/auth/verify/resend",
    ]);
    expect(BOT_CHECKED.every((r) => r.method === "POST")).toBe(true);
  });

  it("only checks on Vercel, so local builds and tests never call it", async () => {
    vi.stubEnv("VERCEL", "");
    expect(await looksAutomated()).toBe(false);
    expect(checkBotId).not.toHaveBeenCalled();
  });

  it("refuses what BotID calls a bot, and lets people through", async () => {
    vi.stubEnv("VERCEL", "1");
    checkBotId.mockResolvedValueOnce({ isBot: true });
    expect(await looksAutomated()).toBe(true);
    checkBotId.mockResolvedValueOnce({ isBot: false });
    expect(await looksAutomated()).toBe(false);
  });

  it("lets requests through when the check itself fails, so an outage doesn't lock learners out", async () => {
    vi.stubEnv("VERCEL", "1");
    checkBotId.mockRejectedValueOnce(new Error("VERCEL_OIDC_TOKEN is not set"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await looksAutomated()).toBe(false);
    warn.mockRestore();
  });

  it("can be turned off with BOT_CHECK=off", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("BOT_CHECK", "off");
    expect(await looksAutomated()).toBe(false);
    expect(checkBotId).not.toHaveBeenCalled();
  });
});
