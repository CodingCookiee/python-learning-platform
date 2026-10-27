import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { callWithLearnerKey } from "@/lib/ai/credentials";
import { PROVIDERS } from "@/lib/ai/gateway";

// The test call gives the provider up to 30 s
export const maxDuration = 60;

const testSchema = z.object({ provider: z.enum(PROVIDERS).optional() }).default({});

/** POST /api/settings/ai/test { provider? }: one tiny call on that provider's saved key (else the default), to check it works */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const parsed = testSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { provider } = parsed.data;
    const call = await callWithLearnerKey(
      context.userId,
      "test",
      {
        system: "You are a connectivity check. Reply with the single word OK.",
        messages: [{ role: "user", content: "Ping" }],
        maxTokens: 16,
        timeoutMs: 30_000,
      },
      provider ? { choice: { provider } } : {}
    );
    if (!call.ok) return NextResponse.json({ error: call.error, code: call.code }, { status: call.status });
    return NextResponse.json({
      ok: true,
      provider: call.provider,
      model: call.model,
      reply: call.result.text.slice(0, 40),
    });
  } catch (error) {
    console.error("Error testing AI key:", error);
    return NextResponse.json({ error: "The test call failed" }, { status: 500 });
  }
});
