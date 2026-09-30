import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { PROVIDERS } from "@/lib/ai/gateway";
import { AiError } from "@/lib/ai/gateway";
import { deleteCredential, getCredentialSummary, getUsageSummary, saveCredential } from "@/lib/ai/credentials";
import { isEncryptionConfigured } from "@/lib/crypto";

const saveSchema = z.object({
  provider: z.enum(PROVIDERS),
  model: z
    .string()
    .trim()
    .min(1, "Choose a model")
    .max(100)
    .regex(/^[\w.:/-]+$/, "Model names are letters, digits, dots, dashes and colons"),
  /** Omit to keep the stored key (same provider only) */
  apiKey: z.string().trim().min(8).max(500).optional(),
});

/** GET /api/settings/ai: the learner's provider, model and key hint (never the key), and their usage */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  const [credential, usage] = await Promise.all([
    getCredentialSummary(context.userId),
    getUsageSummary(context.userId),
  ]);
  return NextResponse.json({ credential, usage, available: isEncryptionConfigured() });
});

/** PUT /api/settings/ai: save the provider, model and (optionally) a new key */
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
    return NextResponse.json({ credential });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("Error saving AI credential:", e);
    return NextResponse.json({ error: "Couldn't save the key" }, { status: 500 });
  }
});

/** DELETE /api/settings/ai: forget the key */
export const DELETE = withAuth(async (_req: NextRequest, context: AuthContext) => {
  await deleteCredential(context.userId);
  return NextResponse.json({ success: true });
});
