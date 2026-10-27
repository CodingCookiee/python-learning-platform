import { prisma } from "@/lib/prisma";
import { startOfDay, startOfMonth } from "@/lib/day";
import { learnerTimeZone } from "@/lib/learner-time-zone";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  AiError,
  complete,
  PROVIDER_LABEL,
  PROVIDERS,
  type CompleteRequest,
  type CompleteResult,
  type Provider,
} from "@/lib/ai/gateway";
import { modelName, type SavedKey } from "@/lib/ai/models";

/**
 * Learners' own AI keys, one per provider, and the metered call that uses them. Keys are
 * encrypted at rest, bound to the user id, decrypted only for the call, and never returned
 * to the browser (only the last four characters are). One key is the default: it answers
 * wherever the learner hasn't picked a model.
 */

/** Calls a learner can make in a day, whatever the feature, to protect the server */
export const DAILY_CALL_LIMIT = 150;

export interface CredentialSummary {
  provider: Provider;
  model: string;
  keyHint: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface UsageSummary {
  today: { calls: number; input: number; output: number };
  month: { calls: number; input: number; output: number };
  dailyLimit: number;
}

const byProvider = (a: { provider: string }, b: { provider: string }) =>
  PROVIDERS.indexOf(a.provider as Provider) - PROVIDERS.indexOf(b.provider as Provider);

const summary = (c: { provider: string; model: string; keyHint: string; isDefault: boolean; updatedAt: Date }) => ({
  provider: c.provider as Provider,
  model: c.model,
  keyHint: c.keyHint,
  isDefault: c.isDefault,
  updatedAt: c.updatedAt.toISOString(),
});

/** Every key the learner has saved, for Settings, in the providers' order */
export async function getCredentials(userId: string): Promise<CredentialSummary[]> {
  const rows = await prisma.aiCredential.findMany({ where: { userId } });
  return rows.sort(byProvider).map(summary);
}

/** What the model switcher needs to know about the learner's keys */
export async function getSavedKeys(userId: string): Promise<SavedKey[]> {
  const rows = await prisma.aiCredential.findMany({
    where: { userId },
    select: { provider: true, model: true, isDefault: true },
  });
  return rows.sort(byProvider).map((r) => ({ provider: r.provider as Provider, model: r.model, isDefault: r.isDefault }));
}

/**
 * Save the key for one provider: a new key, or a new model or default for the one already saved.
 * The learner's first key becomes the default; making one the default clears the others.
 */
export async function saveCredential(
  userId: string,
  data: { provider: Provider; model: string; apiKey?: string; isDefault?: boolean }
): Promise<CredentialSummary> {
  const key = data.apiKey?.trim();
  const secret = key ? { encryptedKey: encryptSecret(key, userId), keyHint: key.slice(-4) } : {};
  const saved = await prisma.$transaction(async (tx) => {
    const existing = await tx.aiCredential.findUnique({ where: { userId_provider: { userId, provider: data.provider } } });
    if (!key && !existing) throw new AiError("bad_request", `Paste an API key for ${PROVIDER_LABEL[data.provider]}.`);
    const hasDefault = (await tx.aiCredential.count({ where: { userId, isDefault: true } })) > 0;
    const isDefault = data.isDefault === true || (existing ? existing.isDefault : !hasDefault);
    if (isDefault) {
      await tx.aiCredential.updateMany({ where: { userId, provider: { not: data.provider } }, data: { isDefault: false } });
    }
    return tx.aiCredential.upsert({
      where: { userId_provider: { userId, provider: data.provider } },
      create: { userId, provider: data.provider, model: data.model, isDefault, encryptedKey: "", keyHint: "", ...secret },
      update: { model: data.model, isDefault, ...secret },
    });
  });
  return summary(saved);
}

/** Forget one provider's key. If it was the default, the next remaining key takes over */
export async function deleteCredential(userId: string, provider: Provider): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.aiCredential.deleteMany({ where: { userId, provider } });
    const rest = (await tx.aiCredential.findMany({ where: { userId } })).sort(byProvider);
    if (rest.length > 0 && !rest.some((r) => r.isDefault)) {
      await tx.aiCredential.update({ where: { id: rest[0]!.id }, data: { isDefault: true } });
    }
  });
}

/** When the learner's day began, in their own time zone: the daily cap resets at their midnight */
async function startOfToday(userId: string): Promise<Date> {
  return startOfDay(new Date(), await learnerTimeZone(userId));
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const timeZone = await learnerTimeZone(userId);
  const [today, thisMonth] = await Promise.all(
    [startOfDay(new Date(), timeZone), startOfMonth(new Date(), timeZone)].map((since) =>
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
 * Make one AI call on the learner's key: the chosen provider's key and model, or the default key and
 * its model. Checks there is a key and the daily limit (one limit across every key), decrypts, calls,
 * and logs the tokens to LlmUsage. A chosen provider without a key is refused, never swapped for
 * another provider: the learner pays for each call.
 */
export async function callWithLearnerKey(
  userId: string,
  feature: "tutor" | "explain" | "test" | "review" | "grade" | "sensei",
  req: Omit<CompleteRequest, "provider" | "apiKey" | "model">,
  extra: { exerciseId?: string; choice?: { provider: Provider; model?: string } } = {}
): Promise<MeteredResult> {
  const { choice } = extra;
  const cred = choice
    ? await prisma.aiCredential.findUnique({ where: { userId_provider: { userId, provider: choice.provider } } })
    : await prisma.aiCredential.findFirst({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  if (!cred) {
    if (choice && (await prisma.aiCredential.count({ where: { userId } })) > 0) {
      const model = choice.model ? modelName(choice.provider, choice.model) : `a ${PROVIDER_LABEL[choice.provider]} model`;
      return {
        ok: false,
        status: 409,
        code: "no_key_for_provider",
        error: `Add a key for ${PROVIDER_LABEL[choice.provider]} in Settings to use ${model}, or pick another model.`,
      };
    }
    return { ok: false, status: 409, code: "no_key", error: "Add your API key in Settings to use the tutor." };
  }
  const model = choice?.model ?? cred.model;

  const calls = await prisma.llmUsage.count({ where: { userId, createdAt: { gte: await startOfToday(userId) } } });
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
    const result = await complete({ ...req, provider, apiKey, model });
    await prisma.llmUsage.create({
      data: {
        userId,
        feature,
        provider,
        model,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        cachedTokens: result.usage.cached,
        exerciseId: extra.exerciseId ?? null,
      },
    });
    return { ok: true, result, provider, model };
  } catch (e) {
    if (e instanceof AiError) {
      const status = e.code === "auth" ? 401 : e.code === "rate_limit" ? 429 : e.code === "bad_request" ? 400 : 502;
      // With a key per provider, say which one: "the provider" no longer tells the learner where to look
      const label = PROVIDER_LABEL[provider];
      const error =
        e.code === "bad_request"
          ? `${label} refused the request: ${e.message} Check the model name, or pick another model.`
          : e.code === "auth"
            ? `${label} rejected your API key. Check it in Settings.`
            : e.message.replace(/^The provider/, label);
      return { ok: false, status, code: e.code, error };
    }
    throw e;
  }
}
