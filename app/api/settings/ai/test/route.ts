import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { callWithLearnerKey } from "@/lib/ai/credentials";

/** POST /api/settings/ai/test: one tiny call on the saved key, to check the key and model work */
export const POST = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    const call = await callWithLearnerKey(context.userId, "test", {
      system: "You are a connectivity check. Reply with the single word OK.",
      messages: [{ role: "user", content: "Ping" }],
      maxTokens: 16,
      timeoutMs: 30_000,
    });
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
