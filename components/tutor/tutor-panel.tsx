"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LessonContent } from "@/components/lesson";
import { TutorWaiting } from "@/components/tutor/tutor-waiting";
import { waitLines } from "@/lib/tutor/wait-lines";
import { cn } from "@/lib/utils";
import { Sensei } from "@/components/quest/sensei";
import { AnsweringWith, useModelChoice } from "@/components/ai/model-switcher";
import { modelName, type SavedKey } from "@/lib/ai/models";
import type { Provider } from "@/lib/ai/gateway";

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
  /** Which model answered, so a switch partway through is marked on the first reply after it */
  model?: { provider: Provider; id: string };
}

/** "Answered by GPT-5 mini" under a reply whose model differs from the reply before it */
function switchedModel(turns: Turn[], i: number): string | null {
  const model = turns[i]!.model;
  if (!model) return null;
  for (let j = i - 1; j >= 0; j--) {
    const before = turns[j]!.model;
    if (turns[j]!.role !== "assistant" || !before) continue;
    return before.provider === model.provider && before.id === model.id ? null : modelName(model.provider, model.id);
  }
  return null;
}

/** The tutor's face: the Sensei's head (the same as the site's Ask the Sensei button), framed */
function TutorFace() {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-sm border border-(--keyline)/40 bg-accent"
    >
      <Sensei head className="size-8" />
    </span>
  );
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

/** The learner hid the "add a key" offer; remembered in this browser across drills */
const OFFER_HIDDEN_KEY = "tutor-offer-hidden";

function readOfferHidden(): boolean {
  try {
    return localStorage.getItem(OFFER_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function TutorPanel({
  exerciseId,
  aiKeys,
  getContext,
  onUsed,
  ref,
}: {
  exerciseId: string;
  /** The learner's AI keys; without one the tutor offers to add a key */
  aiKeys: SavedKey[];
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
  const [needsKey, setNeedsKey] = React.useState(aiKeys.length === 0);
  const [choice, choose] = useModelChoice("tutor", aiKeys);
  // The offer can be hidden for good, unless the learner then asks the tutor something (which says why it can't)
  const [askedWithoutKey, setAskedWithoutKey] = React.useState(false);
  const [hiddenNow, setHiddenNow] = React.useState(false);
  const hiddenBefore = React.useSyncExternalStore(
    () => () => {},
    readOfferHidden,
    () => false
  );
  const offerHidden = (hiddenNow || hiddenBefore) && !askedWithoutKey;

  function hideOffer() {
    setHiddenNow(true);
    try {
      localStorage.setItem(OFFER_HIDDEN_KEY, "1");
    } catch {
      // Hidden for this page only; that's fine
    }
  }
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
            ...(choice ? { choice } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          reply?: string;
          question?: string;
          redacted?: boolean;
          error?: string;
          code?: string;
          provider?: Provider;
          model?: string;
        };
        if (!res.ok || !data.reply) {
          if (data.code === "no_key") {
            setNeedsKey(true);
            setAskedWithoutKey(true);
          }
          setError(data.error ?? "The tutor couldn't answer. Try again.");
          // Drop the unanswered question so the history stays in pairs
          setTurns((t) => t.slice(0, -1));
          return;
        }
        setTurns((t) => {
          const copy = [...t];
          // Keep the server's wording of the question, so later turns carry the same history
          copy[copy.length - 1] = { role: "user", content: data.question ?? question, label };
          const model = data.provider && data.model ? { provider: data.provider, id: data.model } : undefined;
          return [...copy, { role: "assistant", content: data.reply!, redacted: data.redacted, model }];
        });
      } catch {
        setError("We couldn't reach the server. Check your connection and try again.");
        setTurns((t) => t.slice(0, -1));
      } finally {
        setBusy(false);
      }
    },
    [busy, turns, exerciseId, getContext, onUsed, choice]
  );

  React.useImperativeHandle(ref, () => ({ explain: (err: string) => void send("explain", "", err) }), [send]);

  if (needsKey) {
    if (offerHidden) return null;
    return (
      <div className="flex items-start gap-3.5 rounded-md border border-dashed border-(--keyline)/45 py-3 pr-2 pl-3 text-sm text-muted-foreground">
        <TutorFace />
        <p className="flex-1 self-center leading-relaxed">
          <span className="font-semibold text-foreground">Stuck? Ask the tutor.</span> It points you the
          right way without giving the answer away, and runs on your own API key:{" "}
          <Link href="/settings" className="font-medium text-primary underline">
            add one in Settings
          </Link>
          .
        </p>
        {!askedWithoutKey && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={hideOffer}
            aria-label="Hide the tutor offer on every drill"
            title="Hide on every drill (Settings still has it)"
            className="-my-1 shrink-0"
          >
            <X aria-hidden="true" />
          </Button>
        )}
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
        <span id="tutor-heading" className="flex items-center gap-3 font-semibold">
          <TutorFace />
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
                    <>
                      <LessonContent content={t.content} runnable={false} trusted={false} className="[&_p]:mb-2 [&_p]:text-sm [&_p:last-child]:mb-0" />
                      {switchedModel(turns, i) && (
                        <p className="mt-1.5 text-xs text-muted-foreground">Answered by {switchedModel(turns, i)}</p>
                      )}
                    </>
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

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <AnsweringWith keys={aiKeys} choice={choice} onChoose={choose} disabled={busy} />
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
