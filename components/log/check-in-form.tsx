"use client";

import * as React from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCheckIn } from "@/lib/learning-log-format";
import type { LogWeek, WeekPrompts } from "@/lib/learning-log";

type Fields = Pick<LogWeek, "hours" | "built" | "learned" | "stuck" | "nextGoal" | "question">;

const FIELDS: Array<{ key: Exclude<keyof Fields, "hours">; label: string; hint: string; rows: number }> = [
  { key: "built", label: "Built or finished", hint: "One to three lines: lessons, gradings, capstones, labs.", rows: 3 },
  { key: "learned", label: "Learned", hint: "One or two key ideas, in your own words. Writing it yourself is what makes it stick.", rows: 2 },
  { key: "stuck", label: "Stuck on", hint: "A specific problem, or leave it empty for “nothing”.", rows: 2 },
  { key: "nextGoal", label: "Next week's goal", hint: "One concrete deliverable.", rows: 2 },
  { key: "question", label: "A question to ask", hint: "Optional: for your AI assistant or mentor.", rows: 2 },
];

export function CopyCheckIn({ text, label = "Copy check-in" }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        })
      }
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/** A prompt beside "Learned" or "Stuck on", from the week's drills. The learner writes the answer */
function promptFor(key: keyof Fields, prompts: WeekPrompts | undefined): string | null {
  if (!prompts) return null;
  if (key === "learned" && prompts.topics.length > 0) {
    return `Your drills this week covered ${listed(prompts.topics)}. What idea from them would you explain to someone else?`;
  }
  if (key === "stuck" && prompts.unsolved.length > 0) {
    return `Tried and not passed yet: ${listed(prompts.unsolved.map((t) => `“${t}”`))}. What got in the way?`;
  }
  return null;
}

function listed(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function CheckInForm({ initial }: { initial: LogWeek }) {
  const [fields, setFields] = React.useState<Fields>(initial);
  const [saved, setSaved] = React.useState(initial.saved);
  const [busy, setBusy] = React.useState<"save" | "refill" | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [prompts, setPrompts] = React.useState(initial.prompts);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const text = formatCheckIn({ phase: initial.phase, week: initial.week, ...fields });

  async function save() {
    setBusy("save");
    setStatus(null);
    try {
      const res = await fetch("/api/log", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setSaved(true);
        setStatus("Saved to your log.");
      } else setStatus(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "That didn't save.");
    } catch {
      setStatus("We couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function refill() {
    setBusy("refill");
    setStatus(null);
    try {
      const res = await fetch("/api/log");
      if (res.ok) {
        const draft = (await res.json()) as LogWeek;
        // Keep what the learner wrote in the fields activity doesn't fill
        setFields((f) => ({ ...draft, learned: f.learned, stuck: f.stuck, question: f.question }));
        setPrompts(draft.prompts);
        setSaved(false);
        setStatus("Refilled from this week's activity. Your own notes are kept.");
      } else setStatus("Couldn't read this week's activity. Try again in a moment.");
    } catch {
      setStatus("We couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="log-hours">Hours this week</Label>
          <Input
            id="log-hours"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={fields.hours}
            onChange={(e) => set("hours", Number(e.target.value))}
            className="font-condensed tabular w-28 text-lg font-bold"
          />
          <p className="text-sm text-muted-foreground">Estimated from your lessons, drills, reviews and gradings. Add time spent elsewhere.</p>
        </div>
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-2">
            <Label htmlFor={`log-${f.key}`}>{f.label}</Label>
            <Textarea
              id={`log-${f.key}`}
              rows={f.rows}
              value={fields[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              aria-describedby={`log-${f.key}-hint${promptFor(f.key, prompts) ? ` log-${f.key}-prompt` : ""}`}
            />
            <p id={`log-${f.key}-hint`} className="text-sm text-muted-foreground">
              {f.hint}
            </p>
            {promptFor(f.key, prompts) && (
              <p id={`log-${f.key}-prompt`} className="border-l-2 border-highlight pl-3 text-sm text-muted-foreground">
                {promptFor(f.key, prompts)}
              </p>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <LoadingButton type="submit" loading={busy === "save"} loadingText="Saving…" disabled={busy === "refill"}>
            {saved ? "Saved" : "Save this week"}
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="ghost"
            onClick={() => void refill()}
            loading={busy === "refill"}
            loadingText="Reading this week…"
            disabled={busy === "save"}
            icon={<RotateCcw aria-hidden="true" />}
          >
            Refill from this week&apos;s activity
          </LoadingButton>
          {status && (
            <p role="status" className="text-sm text-muted-foreground">
              {status}
            </p>
          )}
        </div>
      </form>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Your check-in</h2>
          <CopyCheckIn text={text} />
        </div>
        <pre className="overflow-x-auto rounded-md border border-border bg-sheet p-4 font-mono text-[0.8125rem] leading-6 whitespace-pre-wrap">
          {text}
        </pre>
        <p className="text-sm text-muted-foreground">
          The roadmap&apos;s weekly check-in format. Paste it into a chat with your AI assistant at the start of the week for a plan,
          or send it to a mentor.
        </p>
      </aside>
    </div>
  );
}
