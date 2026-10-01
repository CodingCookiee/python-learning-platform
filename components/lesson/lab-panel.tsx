"use client";

import * as React from "react";
import { Check, Copy, FlaskConical, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LabView } from "@/lib/labs";
import type { CiLinkView } from "@/lib/ci/links";
import { CiPanel } from "@/components/ci/ci-panel";

/**
 * A lesson's local lab: what to do on your own machine, and the check that
 * confirms it. Webhook labs give the learner a personal URL to POST to; url labs
 * probe a deployment; output labs match pasted command output.
 */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function sampleBody(expect: Record<string, string | number | boolean>): string {
  // Turn dot paths back into a nested example body
  const root: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(expect)) {
    const parts = path.split(".");
    let cur = root;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) cur[p] = value;
      else cur = (cur[p] ??= {}) as Record<string, unknown>;
    });
  }
  return JSON.stringify(root);
}

export function LabPanel({ initial, ci = null }: { initial: LabView; ci?: CiLinkView | null }) {
  if (initial.spec.kind === "github") {
    return (
      <CiPanel
        kind="lab"
        targetId={initial.lessonId}
        initial={ci}
        title={`Lab: ${initial.spec.title}`}
        intro={`${initial.spec.instructions} The checks run on GitHub Actions in your repo on every push, and passing them verifies the lab (15 XP).`}
      />
    );
  }
  return <LabPanelInner initial={initial} />;
}

function LabPanelInner({ initial }: { initial: LabView }) {
  const [lab, setLab] = React.useState(initial);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState<"check" | "refresh" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { spec } = lab;
  const verified = lab.verifiedAt !== null;

  async function refresh() {
    setBusy("refresh");
    try {
      const res = await fetch(`/api/labs/${lab.lessonId}`);
      if (res.ok) setLab((await res.json()) as LabView);
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    setBusy("check");
    setError(null);
    try {
      const res = await fetch(`/api/labs/${lab.lessonId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec.kind === "url" ? { url: input } : { output: input }),
      });
      const data = (await res.json().catch(() => ({}))) as LabView & { error?: string };
      if (!res.ok) setError(data.error ?? "The check didn't run.");
      else setLab(data);
    } catch {
      setError("We couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  const curl =
    lab.webhookUrl &&
    `curl -X POST ${lab.webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '${sampleBody(spec.expect)}'`;

  return (
    <section
      aria-labelledby="lab-heading"
      className={cn("flex flex-col gap-4 rounded-md border p-5", verified ? "border-success/35 bg-success/5" : "border-border bg-sheet")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <FlaskConical className="size-5 text-primary" aria-hidden="true" />
        <h2 id="lab-heading" className="text-lg font-semibold">
          Lab: {spec.title}
        </h2>
        <span className={cn("ml-auto text-sm font-semibold", verified ? "text-success" : "text-muted-foreground")}>
          {verified ? "Verified" : "Not verified yet"}
        </span>
      </div>
      <p className="text-[0.9875rem] leading-relaxed">{spec.instructions}</p>

      {spec.kind === "webhook" && lab.webhookUrl && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Your lab URL</span>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-sm border border-border bg-background px-2.5 py-1.5 font-mono text-[0.8125rem]">
                {lab.webhookUrl}
              </code>
              <CopyButton text={lab.webhookUrl} />
            </div>
            <p className="text-xs text-muted-foreground">
              It&apos;s personal: anything sent to it counts as yours. From n8n running in Docker on this machine, use{" "}
              <code>host.docker.internal</code> instead of <code>localhost</code> in the URL.
            </p>
          </div>
          {curl && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">What a passing request looks like</summary>
              <pre className="mt-2 overflow-x-auto rounded-sm border border-border bg-background p-3 font-mono text-xs leading-5">{curl}</pre>
            </details>
          )}
          <Button variant="outline" size="sm" className="w-fit" onClick={() => void refresh()} disabled={busy !== null}>
            {busy === "refresh" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            Check for my request
          </Button>
        </div>
      )}

      {spec.kind === "url" && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="lab-url">
            Your deployed URL <span className="font-normal text-muted-foreground">(the checker fetches {spec.path})</span>
          </label>
          <div className="flex gap-2">
            <Input id="lab-url" value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://my-service.example.com" className="font-mono text-sm" />
            <Button onClick={() => void check()} disabled={busy !== null || !input.trim()}>
              {busy === "check" && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Check
            </Button>
          </div>
        </div>
      )}

      {spec.kind === "output" && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="lab-output">
            Paste the output{spec.command ? <> of <code className="font-mono text-[0.8125rem]">{spec.command}</code></> : null}
          </label>
          <Textarea id="lab-output" value={input} onChange={(e) => setInput(e.target.value)} rows={5} spellCheck={false} className="font-mono text-xs" />
          <Button className="w-fit" onClick={() => void check()} disabled={busy !== null || !input.trim()}>
            {busy === "check" && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            Check
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {lab.lastResult && (
        <div className="flex flex-col gap-1 text-sm" aria-live="polite">
          <p className="font-semibold">
            Last check{lab.lastCheckedAt ? `, ${new Date(lab.lastCheckedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : ""}
          </p>
          <ul className="flex flex-col gap-0.5 font-mono text-[0.8125rem]">
            {lab.lastResult.notes.map((n, i) => (
              <li key={i} className={n.startsWith("✓") ? "text-success" : n.startsWith("✗") ? "text-destructive" : ""}>
                {n}
              </li>
            ))}
          </ul>
          {lab.lastPayload && spec.kind === "webhook" && (
            <details className="mt-1">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">What arrived</summary>
              <pre className="mt-2 max-h-60 overflow-auto rounded-sm border border-border bg-background p-3 font-mono text-xs leading-5">{lab.lastPayload}</pre>
            </details>
          )}
        </div>
      )}
      {!verified && <p className="text-xs text-muted-foreground">Labs are optional practice and never block the lesson. Verifying one earns 15 XP.</p>}
    </section>
  );
}
