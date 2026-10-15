"use client";

import { KnotLoader } from "@/components/brand/knot-loader";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PendingLine } from "@/components/ui/pending-line";
import { LessonContent } from "@/components/lesson";
import { Sensei } from "@/components/quest/sensei";
import { cn } from "@/lib/utils";

/**
 * The Sensei: a guide on every signed-in page, in the bottom-left corner (the quest has the
 * bottom-right). It explains Python and how pylearn works, using the page as context, on the
 * learner's own key. On drills it stands aside for the drill's own tutor, and it's off during a
 * grading. The chat lasts for the browser session, across pages.
 */

interface Turn {
  role: "user" | "assistant";
  content: string;
}

type Status = "loading" | "ready" | "no_key" | "grading" | "error";

const STORE_KEY = "sensei-chat";
const STARTERS = [
  "Explain this page in simpler words",
  "How do gradings and belts work?",
  "What should I do next?",
];

function readTurns(): Turn[] {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? (parsed.filter(
          (t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string"
        ) as Turn[])
      : [];
  } catch {
    return [];
  }
}

function saveTurns(turns: Turn[]) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(turns.slice(-24)));
  } catch {
    // Kept for this page only
  }
}

/** Drills have their own tutor; the Sensei steps aside there */
const isDrill = (path: string) => path.startsWith("/exercises/");
/** Gradings allow no AI at all */
const isGrading = (path: string) => path.startsWith("/checkpoints/");

function useScratchpadOpen(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-scratchpad-open"],
      });
      return () => observer.disconnect();
    },
    () => document.documentElement.hasAttribute("data-scratchpad-open"),
    () => false
  );
}

export function SenseiAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<Status>("loading");
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLOListElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const scratchpadOpen = useScratchpadOpen();
  const panelId = React.useId();

  const blocked = isDrill(pathname) ? "drill" : isGrading(pathname) ? "grading" : null;

  React.useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns, busy]);

  // Escape closes it wherever focus is (with no key there's no box to type in, so focus may be outside)
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  async function openPanel() {
    setOpen(true);
    setTurns(readTurns());
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/sensei", { cache: "no-store" }).catch(() => null);
    setStatus(res?.ok ? ((await res.json()) as { status: Status }).status : "error");
    requestAnimationFrame(() => (inputRef.current ?? panelRef.current)?.focus());
  }

  function close() {
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setError(null);
    const history = turns;
    const next = [...history, { role: "user" as const, content: q }];
    setTurns(next);
    setBusy(true);
    try {
      const res = await fetch("/api/sensei", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history, path: pathname }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.reply) {
        if (data.code === "no_key") setStatus("no_key");
        if (data.code === "grading") setStatus("grading");
        setError(data.error ?? "The Sensei couldn't answer. Try again.");
        // Drop the unanswered question so the history stays in pairs
        setTurns(history);
        setInput(q);
        return;
      }
      const answered = [...next, { role: "assistant" as const, content: data.reply }];
      setTurns(answered);
      saveTurns(answered);
    } catch {
      setError("We couldn't reach the server.");
      setTurns(history);
      setInput(q);
    } finally {
      setBusy(false);
    }
  }

  function newChat() {
    setTurns([]);
    saveTurns([]);
    setError(null);
    inputRef.current?.focus();
  }

  // Out of the quest's way when the scratchpad moves it to this corner on wide screens
  // Bottom-right, under the quest (which sits just above it). With the scratchpad open the right
  // side is the pane: on wide screens the Sensei moves left (the quest too); narrower, the pane's
  // sheet covers the bottom, so it steps aside until the pane closes
  const corner = cn(
    "fixed right-4 bottom-4 z-41",
    scratchpadOpen && "max-xl:hidden xl:right-auto xl:left-4"
  );

  if (blocked) {
    const why =
      blocked === "drill"
        ? "On drills, ask the tutor beside your code: it sees your code and test results, and helps without giving the answer away."
        : "AI help is off during a grading. You've got this.";
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* aria-disabled, not disabled: it still takes focus and hover, so the reason can be read */}
            <button
              type="button"
              aria-disabled="true"
              aria-label={`The Sensei is unavailable here. ${why}`}
              onClick={(e) => e.preventDefault()}
              className={cn(
                corner,
                "flex size-12 cursor-not-allowed items-center justify-center rounded-full border border-border bg-card opacity-55 shadow-float"
              )}
            >
              <Sensei head className="size-8 grayscale" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-64 text-pretty">
            {why}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      {!open && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => void openPanel()}
          aria-expanded={false}
          aria-controls={panelId}
          className={cn(
            corner,
            "group flex h-12 items-center gap-2 rounded-full border border-border bg-card pr-4 pl-1.5 text-sm font-semibold shadow-float transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-accent/70">
            <Sensei head className="size-7" />
          </span>
          <span className="hidden sm:inline">Ask the Sensei</span>
          <span className="sr-only sm:hidden">Ask the Sensei</span>
        </button>
      )}

      {open && (
        <section
          ref={panelRef}
          tabIndex={-1}
          id={panelId}
          aria-label="Ask the Sensei"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
          className={cn(
            "fixed inset-x-2 bottom-2 z-43 flex max-h-[min(40rem,calc(100dvh-5rem))] flex-col rounded-md border border-border bg-card shadow-overlay outline-none md:inset-x-auto md:right-4 md:bottom-4 md:w-[24rem]",
            scratchpadOpen && "xl:right-auto xl:left-4"
          )}
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Sensei head className="size-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">The Sensei</h2>
              <p className="truncate text-xs text-muted-foreground">
                Python and pylearn, on this page
              </p>
            </div>
            {turns.length > 0 && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={newChat}
                aria-label="Start a new chat"
                title="New chat"
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={close} aria-label="Close the Sensei">
              <X aria-hidden="true" />
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {status === "loading" ? (
              <PendingLine icon={<KnotLoader size="sm" />} lines={["Waking the Sensei…"]} />
            ) : status === "no_key" ? (
              <div className="flex flex-col gap-2 text-sm leading-relaxed">
                <p>
                  I run on your own AI key, like the tutor, so you choose the model and pay your
                  provider directly.
                </p>
                <Button asChild size="sm" className="w-fit">
                  <Link href="/settings">Add a key in Settings</Link>
                </Button>
              </div>
            ) : status === "grading" ? (
              <p className="text-sm leading-relaxed">
                AI help is off while your grading is running, here and in every tab. I&apos;ll be
                back when it&apos;s handed in.
              </p>
            ) : status === "error" ? (
              <p className="text-sm text-muted-foreground">
                I couldn&apos;t check in with the server. Close me and try again.
              </p>
            ) : turns.length === 0 ? (
              <div className="flex flex-col gap-3 text-sm leading-relaxed">
                <p>
                  Ask me about Python, the page you&apos;re on, or how pylearn works. I&apos;ll
                  explain, but I won&apos;t do your drills or gradings for you.
                </p>
                <div className="flex flex-col items-start gap-1.5">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void ask(s)}
                      className="rounded-sm border border-border px-2.5 py-1.5 text-left text-sm hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {status === "ready" && turns.length > 0 && (
              <ol ref={listRef} className="flex flex-col gap-3" aria-live="polite">
                {turns.map((t, i) => (
                  <li
                    key={i}
                    className={cn(
                      "text-sm",
                      t.role === "user" ? "self-end rounded-md bg-accent/60 px-3 py-2" : ""
                    )}
                  >
                    {t.role === "user" ? (
                      <span className="whitespace-pre-wrap">{t.content}</span>
                    ) : (
                      <LessonContent
                        content={t.content}
                        runnable={false}
                        trusted={false}
                        sideToc={false}
                        className="[&_p]:mb-2 [&_p]:text-sm [&_p:last-child]:mb-0"
                      />
                    )}
                  </li>
                ))}
                {busy && (
                  <li>
                    <PendingLine
                      lines={[
                        "Reading your question…",
                        "Thinking it through…",
                        "Writing an answer…",
                      ]}
                      stepMs={2500}
                      stillAfterMs={15_000}
                      slowAfterMs={40_000}
                      still="Still thinking: a fuller answer takes a little longer."
                      slow="Some models are slow to start. It's still working."
                      live={false}
                    />
                  </li>
                )}
              </ol>
            )}
            {status === "ready" && turns.length === 0 && busy && (
              <PendingLine
                icon={<KnotLoader size="sm" />}
                lines={["Reading your question…", "Thinking it through…", "Writing an answer…"]}
                stepMs={2500}
              />
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {status === "ready" && (
            <form
              className="flex items-end gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void ask(input);
              }}
            >
              <label htmlFor={`${panelId}-q`} className="sr-only">
                Your question for the Sensei
              </label>
              <Textarea
                id={`${panelId}-q`}
                ref={inputRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(input);
                  }
                }}
                placeholder="Ask about Python or pylearn"
                className="min-h-0 resize-none text-sm"
                maxLength={4000}
              />
              <Button
                type="submit"
                size="icon-sm"
                disabled={busy || !input.trim()}
                aria-label="Ask"
              >
                <ArrowUp aria-hidden="true" />
              </Button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
