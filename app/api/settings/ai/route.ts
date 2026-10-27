import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { PROVIDERS } from "@/lib/ai/gateway";
import { AiError } from "@/lib/ai/gateway";
import { MODEL_ID } from "@/lib/ai/models";
import { deleteCredential, getCredentials, getUsageSummary, saveCredential } from "@/lib/ai/credentials";
import { isEncryptionConfigured } from "@/lib/crypto";

const saveSchema = z.object({
  provider: z.enum(PROVIDERS),
  model: MODEL_ID,
  /** Omit to keep this provider's stored key */
  apiKey: z.string().trim().min(8).max(500).optional(),
  /** Make this the key used where the learner hasn't picked a model */
  isDefault: z.boolean().optional(),
});

/** GET /api/settings/ai: the learner's keys (provider, model, hint, default; never the key) and their usage */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  const [credentials, usage] = await Promise.all([getCredentials(context.userId), getUsageSummary(context.userId)]);
  return NextResponse.json({ credentials, usage, available: isEncryptionConfigured() });
});

/** PUT /api/settings/ai: save one provider's key, model and (optionally) default; answers with every key */
export const PUT = withAuth(async (req: NextRequest, context: AuthContext) => {
  if (!isEncryptionConfigured()) {
    return NextResponse.json({ error: "AI keys can't be stored until ENCRYPTION_KEY is set on the server." }, { status: 503 });
  }
  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  try {
    const credential = await saveCredential(context.userId, parsed.data);
    return NextResponse.json({ credential, credentials: await getCredentials(context.userId) });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("Error saving AI credential:", e);
    return NextResponse.json({ error: "Couldn't save the key" }, { status: 500 });
  }
});

/** DELETE /api/settings/ai?provider=openai: forget that provider's key; answers with the keys left */
export const DELETE = withAuth(async (req: NextRequest, context: AuthContext) => {
  const provider = z.enum(PROVIDERS).safeParse(req.nextUrl.searchParams.get("provider"));
  if (!provider.success) return NextResponse.json({ error: "Say which provider's key to remove." }, { status: 400 });
  await deleteCredential(context.userId, provider.data);
  return NextResponse.json({ success: true, credentials: await getCredentials(context.userId) });
});
