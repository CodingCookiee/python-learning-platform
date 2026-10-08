"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUp, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LessonContent } from "@/components/lesson";
import { TutorWaiting } from "@/components/tutor/tutor-waiting";
import { waitLines } from "@/lib/tutor/wait-lines";
import { cn } from "@/lib/utils";

/**
 * The Socratic tutor beside a drill. It runs on the learner's own key (Settings),
 * sees their current code and latest result with each question, and nudges rather
 * than answers. The conversation lives in the page; nothing is stored but usage.
 */

interface Turn {
  role: "user" | "assistant";
  content: string;
  /** What the learner sees for their turn (an explain request shows as a label) */
  label?: string;
  redacted?: boolean;
}

export interface TutorContext {
  code: string;
  result?: string;
}

export interface TutorHandle {
  explain: (error: string) => void;
}

const STARTERS = [
  { label: "Where do I start?", question: "I'm not sure where to start. What should I think about first?" },
  { label: "Why is a test failing?", question: "Why is my code failing the tests? Point me at the problem without fixing it." },
  { label: "Is there a more Pythonic way?", question: "My approach works, or nearly. Is there a more Pythonic way to think about it?" },
];

export function TutorPanel({
  exerciseId,
  aiReady,
  getContext,
  onUsed,
  ref,
}: {
  exerciseId: string;
  aiReady: boolean;
  getContext: () => TutorContext;
  /** Called on the first question, e.g. so a review knows help was used */
  onUsed?: () => void;
  ref?: React.Ref<TutorHandle>;
}) {
  const [open, setOpen] = React.useState(false);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  // What the waiting reply says, built from what this question sends
  const [waiting, setWaiting] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [needsKey, setNeedsKey] = React.useState(!aiReady);
  const listRef = React.useRef<HTMLOListElement>(null);
  const usedRef = React.useRef(false);

  React.useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns, busy]);

  const send = React.useCallback(
    async (kind: "chat" | "explain", question: string, errorText?: string) => {
      if (busy) return;
      setOpen(true);
      setError(null);
      if (!usedRef.current) {
        usedRef.current = true;
        onUsed?.();
      }
      const history = turns.map(({ role, content }) => ({ role, content }));
      const label = kind === "explain" ? "Explain this error" : undefined;
      setTurns((t) => [...t, { role: "user", content: question, label }]);
      setBusy(true);
      try {
        const ctx = getContext();
        setWaiting(waitLines({ kind, code: ctx.code, result: ctx.result, error: errorText }));
        const res = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseId,
            kind,
            history,
            question: kind === "chat" ? question : "",
            code: ctx.code,
            result: ctx.result?.slice(0, 8000),
            error: errorText?.slice(0, 8000),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          reply?: string;
          question?: string;
          redacted?: boolean;
          error?: string;
          code?: string;
        };
        if (!res.ok || !data.reply) {
          if (data.code === "no_key") setNeedsKey(true);
          setError(data.error ?? "The tutor couldn't answer.");
          // Drop the unanswered question so the history stays in pairs
          setTurns((t) => t.slice(0, -1));
          return;
        }
        setTurns((t) => {
          const copy = [...t];
          // Keep the server's wording of the question, so later turns carry the same history
          copy[copy.length - 1] = { role: "user", content: data.question ?? question, label };
          return [...copy, { role: "assistant", content: data.reply!, redacted: data.redacted }];
        });
      } catch {
        setError("We couldn't reach the server.");
        setTurns((t) => t.slice(0, -1));
      } finally {
        setBusy(false);
      }
    },
    [busy, turns, exerciseId, getContext, onUsed]
  );

  React.useImperativeHandle(ref, () => ({ explain: (err: string) => void send("explain", "", err) }), [send]);

  if (needsKey) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Stuck? The AI tutor points you the right way without giving the answer away. It runs on your own API key:{" "}
          <Link href="/settings" className="font-medium text-primary underline">
            add one in Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  function submit() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    void send("chat", q);
  }

  return (
    <section aria-labelledby="tutor-heading" className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-left hover:bg-accent/50"
      >
        <span id="tutor-heading" className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircleQuestion className="size-4 text-primary" aria-hidden="true" />
          Ask the tutor
        </span>
        <span className="text-xs text-muted-foreground">It nudges; it won&apos;t write the answer</span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border p-4">
          {turns.length > 0 && (
            <ol ref={listRef} className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
              {turns.map((t, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm leading-relaxed",
                    t.role === "user" ? "ml-8 self-end bg-accent/60" : "mr-4 bg-sheet"
                  )}
                >
                  {t.role === "user" ? (
                    <p className="whitespace-pre-wrap">{t.label ?? t.content}</p>
                  ) : (
                    <LessonContent content={t.content} runnable={false} className="[&_p]:mb-2 [&_p]:text-sm [&_p:last-child]:mb-0" />
                  )}
                </li>
              ))}
              {/* Keyed by the question, so each wait starts its lines afresh */}
              {busy && waiting.length > 0 && <TutorWaiting key={turns.length} lines={waiting} />}
            </ol>
          )}

          {turns.length === 0 && !busy && (
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <Button key={s.label} variant="outline" size="sm" onClick={() => void send("chat", s.question)}>
                  {s.label}
                </Button>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder="Ask about your code. It sees what's in the editor and your last run."
              className="min-h-0 text-sm"
              aria-label="Question for the tutor"
            />
            <Button size="icon" onClick={submit} disabled={busy || !input.trim()} aria-label="Send">
              <ArrowUp aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
