import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import {
  callWithLearnerKey,
  deleteCredential,
  DAILY_CALL_LIMIT,
  getCredentials,
  getSavedKeys,
  getUsageSummary,
  saveCredential,
} from "@/lib/ai/credentials";
import type { Provider } from "@/lib/ai/gateway";
import { consumeToken, issueToken } from "@/lib/auth-tokens";
import { getAiUsageReport } from "@/lib/ai/usage-report";
import { makeLearner } from "./helpers";

let learner: Awaited<ReturnType<typeof makeLearner>>;
beforeAll(async () => {
  learner = await makeLearner("ai");
});
afterAll(() => learner.cleanup());
afterEach(() => vi.unstubAllGlobals());

/** A fake provider that answers in Anthropic's, OpenAI's or Gemini's own format, and records requests */
function fakeProvider(status = 200, errorMessage = "invalid x-api-key") {
  const seen: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    seen.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
    if (status !== 200) return new Response(JSON.stringify({ error: { message: errorMessage } }), { status });
    const payload = url.includes("anthropic")
      ? { content: [{ type: "text", text: "What does divmod return?" }], stop_reason: "end_turn", usage: { input_tokens: 900, output_tokens: 40, cache_read_input_tokens: 700 } }
      : url.includes("generativelanguage")
        ? {
            candidates: [{ content: { role: "model", parts: [{ text: "Weighing the hint…", thought: true }, { text: "Which line runs first?" }] }, finishReason: "STOP" }],
            usageMetadata: { promptTokenCount: 980, candidatesTokenCount: 30, thoughtsTokenCount: 120, cachedContentTokenCount: 600 },
          }
        : { choices: [{ message: { content: "Hint" }, finish_reason: "stop" }], usage: { prompt_tokens: 950, completion_tokens: 45 } };
    return new Response(JSON.stringify(payload), { status: 200 });
  });
  return seen;
}

const ask = (choice?: { provider: Provider; model?: string }, userId = learner.user.id) =>
  callWithLearnerKey(userId, "tutor", { system: "s", messages: [{ role: "user", content: "hi" }], maxTokens: 50 }, { choice });
const keyRow = (userId: string, provider: Provider) =>
  prisma.aiCredential.findUniqueOrThrow({ where: { userId_provider: { userId, provider } } });

describe("learners' own AI keys", () => {
  it("need a key first", async () => {
    const r = await ask();
    expect(!r.ok && r.code).toBe("no_key");
  });

  it("are stored encrypted, shown only by their last four characters", async () => {
    await saveCredential(learner.user.id, { provider: "anthropic", model: "claude-sonnet-5", apiKey: "sk-ant-api03-abcdefWXYZ" });
    const [summary] = await getCredentials(learner.user.id);
    expect(summary?.keyHint).toBe("WXYZ");
    expect(JSON.stringify(summary)).not.toContain("abcdef");
    const row = await keyRow(learner.user.id, "anthropic");
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
    const row = await keyRow(learner.user.id, "anthropic");
    expect(decryptSecret(row.encryptedKey, learner.user.id).endsWith("WXYZ")).toBe(true);
    await expect(saveCredential(learner.user.id, { provider: "openai", model: "gpt-5-mini" })).rejects.toThrow();
  });

  it("work with OpenAI too, with a system message", async () => {
    await saveCredential(learner.user.id, { provider: "openai", model: "gpt-5-mini", apiKey: "sk-proj-openai-9876" });
    const seen = fakeProvider();
    expect((await ask({ provider: "openai" })).ok).toBe(true);
    expect(seen[0]!.url).toContain("api.openai.com");
    expect(seen[0]!.headers.authorization).toBe("Bearer sk-proj-openai-9876");
    expect((seen[0]!.body.messages as Array<{ role: string }>)[0]!.role).toBe("system");
  });

  it("report a rejected key plainly", async () => {
    fakeProvider(401);
    const r = await ask();
    expect(!r.ok && [r.code, r.status]).toEqual(["auth", 401]);
  });

  it("work with Gemini too: key in a header, its own roles, thinking left out of the reply", async () => {
    await saveCredential(learner.user.id, { provider: "gemini", model: "gemini-3.8-flash", apiKey: "AIzaSy-gemini-5555" });
    const seen = fakeProvider();
    const r = await callWithLearnerKey(
      learner.user.id,
      "tutor",
      {
        system: "s",
        messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "Hello" }, { role: "user", content: "help" }],
        maxTokens: 50,
      },
      { choice: { provider: "gemini" } }
    );
    expect(r.ok && r.result.text).toBe("Which line runs first?");
    expect(seen[0]!.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
    expect(seen[0]!.url).not.toContain("AIza");
    expect(seen[0]!.headers["x-goog-api-key"]).toBe("AIzaSy-gemini-5555");
    expect(seen[0]!.body.systemInstruction).toEqual({ parts: [{ text: "s" }] });
    expect((seen[0]!.body.contents as Array<{ role: string }>).map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(r.ok && r.result.usage).toEqual({ input: 980, output: 150, cached: 600 });
  });

  it("report a rejected Gemini key as a key problem", async () => {
    fakeProvider(400, "API key not valid. Please pass a valid API key.");
    const r = await ask({ provider: "gemini" });
    expect(!r.ok && r.code).toBe("auth");
    expect(!r.ok && r.error).toBe("Google Gemini rejected your API key. Check it in Settings.");
  });

  it("show up in the admin usage report", async () => {
    const report = await getAiUsageReport(7);
    expect(report.daily).toHaveLength(7);
    expect(report.learners.some((l) => l.userId === learner.user.id)).toBe(true);
  });
});

describe("several keys, one per provider", () => {
  let owner: Awaited<ReturnType<typeof makeLearner>>;
  beforeAll(async () => {
    owner = await makeLearner("ai-keys");
  });
  afterAll(() => owner.cleanup());
  const id = () => owner.user.id;

  it("make the first key the default, and keep one key per provider", async () => {
    await saveCredential(id(), { provider: "openai", model: "gpt-5-mini", apiKey: "sk-proj-first-1111" });
    await saveCredential(id(), { provider: "anthropic", model: "claude-haiku-5-5", apiKey: "sk-ant-api03-second2222" });
    await saveCredential(id(), { provider: "anthropic", model: "claude-sonnet-5-5" });
    expect(await getSavedKeys(id())).toEqual([
      { provider: "anthropic", model: "claude-sonnet-5-5", isDefault: false },
      { provider: "openai", model: "gpt-5-mini", isDefault: true },
    ]);
    expect(await prisma.aiCredential.count({ where: { userId: id() } })).toBe(2);
  });

  it("answer on the default key without a choice, and on the chosen key and model with one", async () => {
    const seen = fakeProvider();
    const plain = await ask(undefined, id());
    expect(plain.ok && [plain.provider, plain.model]).toEqual(["openai", "gpt-5-mini"]);
    expect(seen[0]!.url).toContain("api.openai.com");

    const chosen = await ask({ provider: "anthropic", model: "claude-opus-5-5" }, id());
    expect(chosen.ok && [chosen.provider, chosen.model]).toEqual(["anthropic", "claude-opus-5-5"]);
    expect(seen[1]!.headers["x-api-key"]).toBe("sk-ant-api03-second2222");
    expect(seen[1]!.body.model).toBe("claude-opus-5-5");
    // The chosen model is what's logged, not the key's own
    const last = await prisma.llmUsage.findFirstOrThrow({ where: { userId: id() }, orderBy: { createdAt: "desc" } });
    expect([last.provider, last.model]).toEqual(["anthropic", "claude-opus-5-5"]);
  });

  it("refuse a provider without a key rather than spend another provider's", async () => {
    const seen = fakeProvider();
    const before = await prisma.llmUsage.count({ where: { userId: id() } });
    const r = await ask({ provider: "gemini", model: "gemini-3.8-flash" }, id());
    expect(!r.ok && [r.code, r.status]).toEqual(["no_key_for_provider", 409]);
    expect(!r.ok && r.error).toContain("Add a key for Google Gemini");
    expect(seen).toHaveLength(0);
    expect(await prisma.llmUsage.count({ where: { userId: id() } })).toBe(before);
  });

  it("move the default, and hand it on when the default key is removed", async () => {
    await saveCredential(id(), { provider: "anthropic", model: "claude-sonnet-5-5", isDefault: true });
    expect((await getSavedKeys(id())).map((k) => [k.provider, k.isDefault])).toEqual([
      ["anthropic", true],
      ["openai", false],
    ]);
    await deleteCredential(id(), "anthropic");
    expect(await getSavedKeys(id())).toEqual([{ provider: "openai", model: "gpt-5-mini", isDefault: true }]);
  });

  it("share one daily limit across every key", async () => {
    await saveCredential(id(), { provider: "gemini", model: "gemini-3.8-flash", apiKey: "AIzaSy-third-3333" });
    const used = await prisma.llmUsage.count({ where: { userId: id() } });
    await prisma.llmUsage.createMany({
      data: Array.from({ length: DAILY_CALL_LIMIT - used }, () => ({
        userId: id(),
        feature: "tutor",
        provider: "openai",
        model: "gpt-5-mini",
      })),
    });
    fakeProvider();
    const r = await ask({ provider: "gemini" }, id());
    expect(!r.ok && r.code).toBe("daily_limit");
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
