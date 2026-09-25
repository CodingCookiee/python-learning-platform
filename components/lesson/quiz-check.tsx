"use client";

import * as React from "react";
import { parse } from "yaml";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Quiz {
  question: string;
  options: string[];
  answer: number;
  explain: string;
}

function readQuiz(source: string): Quiz | null {
  try {
    const q = parse(source) as Partial<Quiz>;
    if (!q?.question || !Array.isArray(q.options) || typeof q.answer !== "number") return null;
    return { question: String(q.question), options: q.options.map(String), answer: q.answer, explain: String(q.explain ?? "") };
  } catch {
    return null;
  }
}

/** Inline code spans in quiz text: `x` → <code> */
function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded-[3px] bg-accent/70 px-1.5 py-0.5 font-mono text-[0.875em]">
            {part.slice(1, -1)}
          </code>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * A quick check inside a lesson: pick an answer, see whether it's right and why.
 * Not graded, and nothing is saved.
 */
export function QuizCheck({ source }: { source: string }) {
  const quiz = React.useMemo(() => readQuiz(source), [source]);
  const [picked, setPicked] = React.useState<number | null>(null);
  const id = React.useId();
  if (!quiz) return null;
  const answered = picked !== null;
  const correct = picked === quiz.answer;

  return (
    <section
      aria-labelledby={`${id}-q`}
      className="my-8 rounded-md border border-border bg-sheet"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3">
        <span className="font-condensed text-xs font-semibold text-muted-foreground">Quick check</span>
      </div>
      <div className="flex flex-col gap-4 px-5 py-4">
        <p id={`${id}-q`} className="text-[1.0625rem] font-semibold leading-snug">
          <InlineCode text={quiz.question} />
        </p>
        <ul className="flex flex-col gap-2" role="list">
          {quiz.options.map((option, i) => {
            const isAnswer = i === quiz.answer;
            const isPicked = i === picked;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setPicked(i)}
                  aria-pressed={isPicked}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm border px-3.5 py-2.5 text-left font-mono text-[0.9375rem] transition-colors",
                    !answered && "border-border hover:border-(--keyline)/50 hover:bg-accent/40",
                    answered && isAnswer && "border-success/50 bg-success/8",
                    answered && isPicked && !isAnswer && "border-destructive/45 bg-destructive/6",
                    answered && !isPicked && !isAnswer && "border-border opacity-70"
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                    {answered && isAnswer ? (
                      <Check className="size-4 text-success" />
                    ) : answered && isPicked ? (
                      <X className="size-4 text-destructive" />
                    ) : (
                      <span className="size-3 rounded-[2px] border border-(--keyline)/50" />
                    )}
                  </span>
                  <span className="min-w-0 wrap-break-word whitespace-pre-wrap">{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {answered && (
          <p aria-live="polite" className="text-[0.9375rem] leading-relaxed">
            <span className={cn("font-semibold", correct ? "text-success" : "text-destructive")}>
              {correct ? "Right." : "Not quite."}
            </span>{" "}
            <InlineCode text={quiz.explain} />
          </p>
        )}
      </div>
    </section>
  );
}
