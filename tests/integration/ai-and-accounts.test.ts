import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { callWithLearnerKey, getCredentialSummary, getUsageSummary, saveCredential } from "@/lib/ai/credentials";
import { consumeToken, issueToken } from "@/lib/auth-tokens";
import { getAiUsageReport } from "@/lib/ai/usage-report";
import { makeLearner } from "./helpers";

let learner: Awaited<ReturnType<typeof makeLearner>>;
beforeAll(async () => {
  learner = await makeLearner("ai");
});
afterAll(() => learner.cleanup());
afterEach(() => vi.unstubAllGlobals());

/** A fake provider that answers in Anthropic's or OpenAI's own format, and records requests */
function fakeProvider(status = 200) {
  const seen: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    seen.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
    if (status !== 200) return new Response(JSON.stringify({ error: { message: "invalid x-api-key" } }), { status });
    const payload = url.includes("anthropic")
      ? { content: [{ type: "text", text: "What does divmod return?" }], stop_reason: "end_turn", usage: { input_tokens: 900, output_tokens: 40, cache_read_input_tokens: 700 } }
      : { choices: [{ message: { content: "Hint" }, finish_reason: "stop" }], usage: { prompt_tokens: 950, completion_tokens: 45 } };
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  return seen;
}

const ask = () => callWithLearnerKey(learner.user.id, "tutor", { system: "s", messages: [{ role: "user", content: "hi" }], maxTokens: 50 });

describe("learners' own AI keys", () => {
  it("need a key first", async () => {
    const r = await ask();
    expect(!r.ok && r.code).toBe("no_key");
  });

  it("are stored encrypted, shown only by their last four characters", async () => {
    await saveCredential(learner.user.id, { provider: "anthropic", model: "claude-sonnet-5", apiKey: "sk-ant-api03-abcdefWXYZ" });
    const summary = await getCredentialSummary(learner.user.id);
    expect(summary?.keyHint).toBe("WXYZ");
    expect(JSON.stringify(summary)).not.toContain("abcdef");
    const row = await prisma.aiCredential.findUniqueOrThrow({ where: { userId: learner.user.id } });
    expect(row.encryptedKey).not.toContain("abcdef");
  });

  it("are decrypted only for the call, which is logged with its tokens", async () => {
    const seen = fakeProvider();
    const r = await ask();
    expect(r.ok && r.result.text).toBe("What does divmod return?");
    expect(seen[0]!.headers["x-api-key"]).toBe("sk-ant-api03-abcdefWXYZ");
    expect(JSON.stringify(seen[0]!.body.system)).toContain("ephemeral");
    const usage = await getUsageSummary(learner.user.id);
    expect(usage.today).toMatchObject({ calls: 1, input: 1600, output: 40 });
  });

  it("keep the key when only the model changes; a new provider needs a new key", async () => {
    await saveCredential(learner.user.id, { provider: "anthropic", model: "claude-opus-5-5" });
    const row = await prisma.aiCredential.findUniqueOrThrow({ where: { userId: learner.user.id } });
    expect(decryptSecret(row.encryptedKey, learner.user.id).endsWith("WXYZ")).toBe(true);
    await expect(saveCredential(learner.user.id, { provider: "openai", model: "gpt-5-mini" })).rejects.toThrow();
  });

  it("work with OpenAI too, with a system message", async () => {
    await saveCredential(learner.user.id, { provider: "openai", model: "gpt-5-mini", apiKey: "sk-proj-openai-9876" });
    const seen = fakeProvider();
    expect((await ask()).ok).toBe(true);
    expect(seen[0]!.url).toContain("api.openai.com");
    expect(seen[0]!.headers.authorization).toBe("Bearer sk-proj-openai-9876");
    expect((seen[0]!.body.messages as Array<{ role: string }>)[0]!.role).toBe("system");
  });

  it("report a rejected key plainly", async () => {
    fakeProvider(401);
    const r = await ask();
    expect(!r.ok && [r.code, r.status]).toEqual(["auth", 401]);
  });

  it("show up in the admin usage report", async () => {
    const report = await getAiUsageReport(7);
    expect(report.daily).toHaveLength(7);
    expect(report.learners.some((l) => l.userId === learner.user.id)).toBe(true);
  });
});

describe("one-time email tokens", () => {
  const email = `tokens-${Date.now()}@example.invalid`;

  it("give back the email once, lower-cased", async () => {
    const t = await issueToken("verify", email.toUpperCase());
    expect(await consumeToken("verify", t)).toBe(email);
    expect(await consumeToken("verify", t)).toBeNull();
  });

  it("are voided by a newer token and refused for the wrong kind", async () => {
    const first = await issueToken("reset", email);
    const second = await issueToken("reset", email);
    expect(await consumeToken("reset", first)).toBeNull();
    // Offered as the wrong kind it's refused but not used up
    expect(await consumeToken("verify", second)).toBeNull();
    expect(await consumeToken("reset", second)).toBe(email);
    expect(await prisma.verificationToken.count({ where: { identifier: `reset:${email}` } })).toBe(0);
  });

  it("expire", async () => {
    const t = await issueToken("verify", email);
    await prisma.verificationToken.updateMany({ where: { identifier: `verify:${email}` }, data: { expires: new Date(Date.now() - 1000) } });
    expect(await consumeToken("verify", t)).toBeNull();
  });
});
