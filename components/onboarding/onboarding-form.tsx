"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Experience = "new" | "other-language" | "python";
type Goal = "python" | "automation";

const EXPERIENCE: Array<{ value: Experience; title: string; detail: string }> = [
  { value: "new", title: "New to programming", detail: "Start at module 1 and take it in order." },
  {
    value: "other-language",
    title: "I code in another language",
    detail: "JavaScript, Java, Go… The “Coming from JavaScript” notes are for you, and you can test out of early modules.",
  },
  { value: "python", title: "I already write Python", detail: "Test out of what you know with each module's checkpoint, and train the rest." },
];

const GOALS: Array<{ value: Goal; title: string; detail: string }> = [
  { value: "python", title: "Advanced Python", detail: "All 16 modules to the black belt: idioms, internals, testing, async, FastAPI, data." },
  { value: "automation", title: "Python, then AI automation", detail: "The black belt, then the 8 dan grades: LLM APIs, agents, RAG, MCP, n8n, production." },
];

const HOURS = [3, 5, 8, 10, 15, 20];

function Choice<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Array<{ value: T; title: string; detail: string }>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-col gap-1 rounded-md border p-4 text-left transition-colors",
            value === o.value ? "border-primary bg-accent/60" : "border-border hover:border-foreground/35"
          )}
        >
          <span className="font-semibold">{o.title}</span>
          <span className="text-sm text-muted-foreground">{o.detail}</span>
        </button>
      ))}
    </div>
  );
}

export function OnboardingForm({
  first,
  initial,
}: {
  first: boolean;
  initial: { experience: Experience | null; goal: Goal | null; weeklyHours: number };
}) {
  const router = useRouter();
  const [experience, setExperience] = React.useState<Experience | null>(initial.experience);
  const [goal, setGoal] = React.useState<Goal | null>(initial.goal);
  const [hours, setHours] = React.useState(initial.weeklyHours);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    if (!experience || !goal) {
      setError("Pick an answer for each question.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experience, goal, weeklyHours: hours }),
      });
      if (!res.ok) {
        setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "That didn't save.");
        setBusy(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("We couldn't reach the server.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">1. Where are you starting from?</h2>
        <Choice name="Experience" options={EXPERIENCE} value={experience} onChange={setExperience} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">2. Where do you want to get to?</h2>
        <Choice name="Goal" options={GOALS} value={goal} onChange={setGoal} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">3. How many hours a week can you train?</h2>
        <p className="text-sm text-muted-foreground">
          Honest beats ambitious: steady weeks and spaced reviews are what make it stick. 10 is a solid pace alongside
          a job.
        </p>
        <div role="radiogroup" aria-label="Hours per week" className="flex flex-wrap gap-2">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={hours === h}
              onClick={() => setHours(h)}
              className={cn(
                "font-condensed tabular min-w-16 rounded-md border px-4 py-2.5 text-lg font-bold transition-colors",
                hours === h ? "border-primary bg-accent/60" : "border-border hover:border-foreground/35"
              )}
            >
              {h} h
            </button>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => void save()} disabled={busy}>
          {busy && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {first ? "Start training" : "Save my plan"}
        </Button>
        {!first && (
          <Button variant="ghost" onClick={() => router.push("/dashboard")} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
