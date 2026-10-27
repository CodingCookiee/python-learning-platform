import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { withAuth, type AuthContext } from "@/lib/api-auth";
import { callWithLearnerKey, getSavedKeys } from "@/lib/ai/credentials";
import { choiceSchema } from "@/lib/ai/models";
import {
  gradingInProgress,
  resolvePage,
  senseiSystemPrompt,
  senseiUserTurn,
} from "@/lib/ai/sensei";

// The model can take up to 90 s to answer; Vercel must not cut the function off first
export const maxDuration = 120;

const turn = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8_000) });
const askSchema = z.object({
  question: z.string().trim().min(1).max(4_000),
  /** Earlier turns, oldest first (kept by the browser for the session) */
  history: z.array(turn).max(24).default([]),
  /** The page the learner is on, for context */
  path: z.string().max(300).startsWith("/"),
  /** The model picked in the Sensei's switcher; without one, the default key's model */
  choice: choiceSchema,
});

/** Where the Sensei steps back: drills have their own tutor */
const onDrill = (path: string) => path.startsWith("/exercises/");

/**
 * GET /api/sensei: whether the Sensei can help right now ("ready", "no_key", "grading"), and the
 * learner's keys for its model switcher
 * POST /api/sensei { question, history, path }: ask, on the learner's own key
 */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  const [keys, grading] = await Promise.all([getSavedKeys(context.userId), gradingInProgress(context.userId)]);
  const status = grading ? "grading" : keys.length > 0 ? "ready" : "no_key";
  return NextResponse.json({ status, keys }, { headers: { "cache-control": "no-store" } });
});

export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const limited = await rateLimit("sensei", context.userId);
    if (!limited.ok)
      return tooManyRequests(limited, "The Sensei needs a breather. Try again in a minute.");
    const parsed = askSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
    const { question, history, path, choice } = parsed.data;
    if (onDrill(path)) {
      return NextResponse.json(
        { error: "On drills, ask the tutor beside your code.", code: "drill" },
        { status: 403 }
      );
    }
    // No AI anywhere while a grading's clock is running (another tab included)
    if (await gradingInProgress(context.userId)) {
      return NextResponse.json(
        { error: "AI help is off while your grading is running.", code: "grading" },
        { status: 403 }
      );
    }

    const page = await resolvePage(path);
    const call = await callWithLearnerKey(
      context.userId,
      "sensei",
      {
        system: senseiSystemPrompt(page),
        messages: [...history, { role: "user", content: senseiUserTurn(question) }],
        maxTokens: 900,
      },
      { choice }
    );
    if (!call.ok) {
      const error =
        call.code === "no_key" ? "Add your AI key in Settings to talk to the Sensei." : call.error;
      return NextResponse.json({ error, code: call.code }, { status: call.status });
    }
    return NextResponse.json({
      reply:
        call.result.text.trim() ||
        "I don't have a good answer to that. Could you ask it another way?",
      truncated: call.result.truncated,
      provider: call.provider,
      model: call.model,
    });
  } catch (error) {
    console.error("Error in the Sensei:", error);
    return NextResponse.json({ error: "The Sensei couldn't answer. Try again." }, { status: 500 });
  }
});
