import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { AiError, complete, type CompleteRequest, type CompleteResult, type Provider } from "@/lib/ai/gateway";

/**
 * Learners' own AI keys, and the metered call that uses them. Keys are encrypted
 * at rest, bound to the user id, decrypted only for the call, and never returned
 * to the browser (only the last four characters are).
 */

/** Calls a learner can make in a day, whatever the feature, to protect the server */
export const DAILY_CALL_LIMIT = 150;

export interface CredentialSummary {
  provider: Provider;
  model: string;
  keyHint: string;
  updatedAt: string;
}

export interface UsageSummary {
  today: { calls: number; input: number; output: number };
  month: { calls: number; input: number; output: number };
  dailyLimit: number;
}

export async function getCredentialSummary(userId: string): Promise<CredentialSummary | null> {
  const c = await prisma.aiCredential.findUnique({ where: { userId } });
  if (!c) return null;
  return { provider: c.provider as Provider, model: c.model, keyHint: c.keyHint, updatedAt: c.updatedAt.toISOString() };
}

export async function saveCredential(
  userId: string,
  data: { provider: Provider; model: string; apiKey?: string }
): Promise<CredentialSummary> {
  const existing = await prisma.aiCredential.findUnique({ where: { userId } });
  const key = data.apiKey?.trim();
  if (!key && (!existing || existing.provider !== data.provider)) {
    throw new AiError("bad_request", "Paste an API key for this provider.");
  }
  const secret = key ? { encryptedKey: encryptSecret(key, userId), keyHint: key.slice(-4) } : {};
  const saved = await prisma.aiCredential.upsert({
    where: { userId },
    create: { userId, provider: data.provider, model: data.model, encryptedKey: "", keyHint: "", ...secret },
    update: { provider: data.provider, model: data.model, ...secret },
  });
  return { provider: saved.provider as Provider, model: saved.model, keyHint: saved.keyHint, updatedAt: saved.updatedAt.toISOString() };
}

export async function deleteCredential(userId: string): Promise<void> {
  await prisma.aiCredential.deleteMany({ where: { userId } });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  const [today, thisMonth] = await Promise.all(
    [startOfToday(), month].map((since) =>
      prisma.llmUsage.aggregate({
        where: { userId, createdAt: { gte: since } },
        _count: true,
        _sum: { inputTokens: true, outputTokens: true },
      })
    )
  );
  const shape = (a: typeof today) => ({ calls: a!._count, input: a!._sum.inputTokens ?? 0, output: a!._sum.outputTokens ?? 0 });
  return { today: shape(today), month: shape(thisMonth), dailyLimit: DAILY_CALL_LIMIT };
}

export type MeteredResult =
  | { ok: true; result: CompleteResult; provider: Provider; model: string }
  | { ok: false; status: number; code: string; error: string };

/**
 * Make one AI call on the learner's key: checks there is a key and the daily
 * limit, decrypts, calls, and logs the tokens to LlmUsage.
 */
export async function callWithLearnerKey(
  userId: string,
  feature: "tutor" | "explain" | "test" | "review",
  req: Omit<CompleteRequest, "provider" | "apiKey" | "model">,
  extra: { exerciseId?: string } = {}
): Promise<MeteredResult> {
  const cred = await prisma.aiCredential.findUnique({ where: { userId } });
  if (!cred) return { ok: false, status: 409, code: "no_key", error: "Add your API key in Settings to use the tutor." };

  const calls = await prisma.llmUsage.count({ where: { userId, createdAt: { gte: startOfToday() } } });
  if (calls >= DAILY_CALL_LIMIT) {
    return { ok: false, status: 429, code: "daily_limit", error: `That's ${DAILY_CALL_LIMIT} AI calls today. More tomorrow.` };
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(cred.encryptedKey, userId);
  } catch {
    return { ok: false, status: 409, code: "no_key", error: "Your saved key can't be read any more. Paste it again in Settings." };
  }

  const provider = cred.provider as Provider;
  try {
    const result = await complete({ ...req, provider, apiKey, model: cred.model });
    await prisma.llmUsage.create({
      data: {
        userId,
        feature,
        provider,
        model: cred.model,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        cachedTokens: result.usage.cached,
        exerciseId: extra.exerciseId ?? null,
      },
    });
    return { ok: true, result, provider, model: cred.model };
  } catch (e) {
    if (e instanceof AiError) {
      const status = e.code === "auth" ? 401 : e.code === "rate_limit" ? 429 : e.code === "bad_request" ? 400 : 502;
      const error =
        e.code === "bad_request"
          ? `The provider refused the request: ${e.message} Check the model name in Settings.`
          : e.message;
      return { ok: false, status, code: e.code, error };
    }
    throw e;
  }
}
