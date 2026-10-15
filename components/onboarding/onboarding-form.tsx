"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigation-progress";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { forgetStart, readStart } from "@/lib/start-intent";

/** The remembered start never changes while the form is open */
const noSubscribe = () => () => {};

type Experience = "new" | "other-language" | "python";
type Goal = "python" | "automation";

const EXPERIENCE: Array<{ value: Experience; title: string; detail: string }> = [
  {
    value: "new",
    title: "New to programming",
    detail: "Start with Start here, a 4-hour on-ramp in plain language, then module 1.",
  },
  {
    value: "other-language",
    title: "I code in another language",
    detail:
      "JavaScript, Java, Go… The “Coming from JavaScript” notes are for you, and you can test out of early modules.",
  },
  {
    value: "python",
    title: "I already write Python",
    detail: "Test out of what you know with each module's grading, and train the rest.",
  },
];

const GOALS: Array<{ value: Goal; title: string; detail: string }> = [
  {
    value: "python",
    title: "Advanced Python",
    detail: "All 16 modules to the black belt: idioms, internals, testing, async, FastAPI, data.",
  },
  {
    value: "automation",
    title: "Python, then AI automation",
    detail: "The black belt, then the 8 dan grades: LLM APIs, agents, RAG, MCP, n8n, production.",
  },
];

const HOURS = [3, 5, 8, 10, 15, 20];

function Choice<T extends string>({
  name,
  options,
  value,
  onChange,
  locked = false,
}: {
  name: string;
  options: Array<{ value: T; title: string; detail: string }>;
  value: T | null;
  onChange: (v: T) => void;
  /** While the plan saves, the answers hold still */
  locked?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      aria-disabled={locked || undefined}
      className="grid gap-3"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => {
            if (!locked) onChange(o.value);
          }}
          className={cn(
            "flex flex-col gap-1 rounded-md border p-4 text-left transition-colors",
            value === o.value
              ? "border-primary bg-accent/60"
              : "border-border hover:border-foreground/35"
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
  const [picked, setExperience] = React.useState<Experience | null>(initial.experience);
  // "I've never coded" on the landing page pre-selects "New to programming" until an answer is on record
  const remembered = React.useSyncExternalStore(noSubscribe, readStart, () => null);
  const experience = picked ?? (remembered === "new" ? "new" : null);
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
        setError(
          ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "That didn't save."
        );
        setBusy(false);
        return;
      }
      forgetStart();
      // After sign-up a beginner's first stop is the Start on-ramp; plan changes go back to the dashboard
      const { next } = (await res.json().catch(() => ({}))) as { next?: string };
      startNavigation();
      router.push(first && next ? next : "/dashboard");
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
        <Choice
          name="Experience"
          options={EXPERIENCE}
          value={experience}
          onChange={setExperience}
          locked={busy}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">2. Where do you want to get to?</h2>
        <Choice name="Goal" options={GOALS} value={goal} onChange={setGoal} locked={busy} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">3. How many hours a week can you train?</h2>
        <p className="text-sm text-muted-foreground">
          Honest beats ambitious: steady weeks and spaced reviews are what make it stick. 10 is a
          solid pace alongside a job.
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
                hours === h
                  ? "border-primary bg-accent/60"
                  : "border-border hover:border-foreground/35"
              )}
            >
              {h} h
            </button>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <LoadingButton
          size="lg"
          onClick={() => void save()}
          loading={busy}
          loadingText={first ? "Setting up your training…" : "Saving your plan…"}
        >
          {first ? "Start training" : "Save my plan"}
        </LoadingButton>
        {!first && (
          <Button variant="ghost" onClick={() => router.push("/dashboard")} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
