import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getDrillForUser } from "@/lib/drills";
import { callWithLearnerKey } from "@/lib/ai/credentials";
import { EXPLAIN_QUESTION, guardReply, tutorSystemPrompt, tutorUserTurn } from "@/lib/ai/tutor";

const turn = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8_000) });

const tutorSchema = z.object({
  exerciseId: z.string().min(1),
  kind: z.enum(["chat", "explain"]).default("chat"),
  /** Earlier turns of this conversation, oldest first (kept by the browser) */
  history: z.array(turn).max(24).default([]),
  question: z.string().trim().max(4_000).default(""),
  code: z.string().max(40_000),
  result: z.string().max(8_000).optional(),
  error: z.string().max(8_000).optional(),
});

/**
 * POST /api/tutor
 * Ask the Socratic tutor about a drill, on the learner's own key. The model sees
 * the drill, the learner's code and latest result, but never the reference
 * solution, and the reply is checked so it can't hand the answer over anyway.
 * Off during checkpoints.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const limited = await rateLimit("tutor", context.userId);
    if (!limited.ok) return tooManyRequests(limited, "The tutor needs a breather.");
    const parsed = tutorSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { exerciseId, kind, history, code, result, error } = parsed.data;
    const question = kind === "explain" ? EXPLAIN_QUESTION : parsed.data.question;
    if (!question) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
    if (kind === "explain" && !error) return NextResponse.json({ error: "There's no error to explain." }, { status: 400 });

    const drill = await getDrillForUser(exerciseId, context.userId);
    if (!drill) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    if (drill.mode.kind === "checkpoint") {
      return NextResponse.json({ error: "The tutor is off during a checkpoint." }, { status: 403 });
    }
    const { solution } = await prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId }, select: { solution: true } });

    const call = await callWithLearnerKey(
      context.userId,
      kind === "explain" ? "explain" : "tutor",
      {
        system: tutorSystemPrompt({
          title: drill.title,
          type: drill.type,
          instructions: drill.instructions,
          starterCode: drill.starterCode,
          hints: drill.hints,
          testNames: drill.testList.map((t) => t.name),
        }),
        // Only the newest turn carries the code and results; older turns stay as they were asked
        messages: [...history, { role: "user", content: tutorUserTurn(question, { code, result, error }) }],
        maxTokens: 700,
      },
      { exerciseId }
    );
    if (!call.ok) return NextResponse.json({ error: call.error, code: call.code }, { status: call.status });

    const guarded = guardReply(call.result.text.trim(), solution, drill.starterCode);
    return NextResponse.json({
      reply: guarded.text || "I don't have anything useful to add there. Try asking about a specific line.",
      redacted: guarded.redacted,
      truncated: call.result.truncated,
      question,
      usage: call.result.usage,
      model: call.model,
    });
  } catch (error) {
    console.error("Error in tutor:", error);
    return NextResponse.json({ error: "The tutor couldn't answer" }, { status: 500 });
  }
});
