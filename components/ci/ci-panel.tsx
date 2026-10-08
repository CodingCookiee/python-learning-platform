"use client";

import * as React from "react";
import { Check, CircleDashed, Copy, Download, ExternalLink, GitBranch, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { PendingLine } from "@/components/ui/pending-line";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CiKind, CiLinkView } from "@/lib/ci/links";

/**
 * GitHub Actions checks for a capstone or a lab: connect a public repo, add the
 * workflow file, push. Results arrive from the workflow and count once GitHub
 * confirms the run. While a run is pending the panel polls on its own.
 */

const STATUS: Record<CiLinkView["status"], { label: string; className: string }> = {
  waiting: { label: "Waiting for a run", className: "text-muted-foreground" },
  reported: { label: "Run reported, confirming with GitHub", className: "text-foreground" },
  passed: { label: "Passed", className: "text-success" },
  failed: { label: "Failed", className: "text-destructive" },
  invalid: { label: "Didn't count", className: "text-destructive" },
};

const passedOn = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function CopyButton({ text, label }: { text: string; label: string }) {
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

export function CiPanel({
  kind,
  targetId,
  initial,
  title,
  intro,
}: {
  kind: CiKind;
  targetId: string;
  initial: CiLinkView | null;
  title: string;
  intro: string;
}) {
  const [link, setLink] = React.useState(initial);
  const [repo, setRepo] = React.useState(initial ? `https://github.com/${initial.repo}` : "");
  const [editing, setEditing] = React.useState(!initial);
  const [busy, setBusy] = React.useState<"connect" | "check" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // While a run is in flight, ask every 15 seconds (the server throttles GitHub calls)
  React.useEffect(() => {
    if (!link || (link.status !== "reported" && link.status !== "waiting")) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/ci/links/${link.id}`).catch(() => null);
      if (res?.ok) setLink((await res.json()) as CiLinkView);
    }, 15_000);
    return () => clearInterval(t);
  }, [link]);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy("connect");
    setError(null);
    try {
      const res = await fetch("/api/ci/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, targetId, repo }),
      });
      const data = (await res.json().catch(() => ({}))) as CiLinkView & { error?: string };
      if (!res.ok) setError(data.error ?? "That didn't connect.");
      else {
        setLink(data);
        setEditing(false);
      }
    } catch {
      setError("We couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    if (!link) return;
    setBusy("check");
    setError(null);
    try {
      const res = await fetch(`/api/ci/links/${link.id}/check`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as CiLinkView & { error?: string };
      if (!res.ok) setError(data.error ?? "The check didn't run.");
      else setLink(data);
    } catch {
      setError("We couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  const status = link ? STATUS[link.status] : null;
  const download = link ? `data:text/yaml;charset=utf-8,${encodeURIComponent(link.workflow)}` : "";

  return (
    <section
      aria-labelledby={`ci-${targetId}`}
      className={cn("flex flex-col gap-5 rounded-md border p-5", link?.verifiedAt ? "border-success/35 bg-success/5" : "border-border bg-sheet")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <GitBranch className="size-5 text-primary" aria-hidden="true" />
        <h2 id={`ci-${targetId}`} className="text-lg font-semibold">
          {title}
        </h2>
        {status && <span className={cn("ml-auto text-sm font-semibold", status.className)}>{status.label}</span>}
      </div>
      <p className="text-[0.9875rem] leading-relaxed">{intro}</p>
      {link?.verifiedAt && link.status !== "passed" && (
        <p className="flex items-start gap-2 text-sm font-semibold text-success">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Passed on {passedOn(link.verifiedAt)}. That pass stays counted, whatever later runs do; the latest run is below.
        </p>
      )}

      {editing || !link ? (
        <form onSubmit={(e) => void connect(e)} className="flex flex-col gap-2">
          <label htmlFor={`repo-${targetId}`} className="text-sm font-semibold">
            1. Your public GitHub repository
          </label>
          <div className="flex gap-2">
            <Input
              id={`repo-${targetId}`}
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="https://github.com/you/project"
              className="font-mono text-sm"
            />
            <LoadingButton type="submit" loading={busy === "connect"} loadingText="Connecting…" disabled={busy === "check" || !repo.trim()}>
              Connect
            </LoadingButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Public repos only: pylearn reads the run from GitHub to confirm it. Actions minutes on public repos are free.
          </p>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold">1. Repository</span>
            <a href={`https://github.com/${link.repo}`} target="_blank" rel="noopener noreferrer" className="font-mono text-primary underline">
              {link.repo}
            </a>
            <button type="button" onClick={() => setEditing(true)} className="text-muted-foreground underline hover:text-foreground">
              Change
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <span className="font-semibold">2. Add this file</span> to the repo as{" "}
              <code className="font-mono text-[0.8125rem]">{link.workflowPath}</code>, unchanged, then commit and push.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show the workflow file</summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded-sm border border-border bg-background p-3 font-mono text-xs leading-5">
                {link.workflow}
              </pre>
            </details>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={link.workflow} label="Copy the file" />
              <Button asChild variant="outline" size="sm">
                <a href={download} download="pylearn.yml">
                  <Download aria-hidden="true" />
                  Download pylearn.yml
                </a>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <span className="font-semibold">3. Push.</span> Each push runs the tests on GitHub and the result shows up here.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <LoadingButton
                variant="outline"
                size="sm"
                onClick={() => void check()}
                loading={busy === "check"}
                loadingText="Checking…"
                disabled={busy === "connect"}
                icon={<RefreshCw aria-hidden="true" />}
              >
                Check now
              </LoadingButton>
              {link.runUrl && (
                <a href={link.runUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary underline">
                  The run on GitHub
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
              {link.sha && <span className="font-mono text-xs text-muted-foreground">{link.sha.slice(0, 7)}</span>}
            </div>
            {link.statusDetail && <p className="text-sm text-muted-foreground">{link.statusDetail}</p>}
            {/* A run in flight: this page asks every 15 seconds, and says so while it waits */}
            {(link.status === "waiting" || link.status === "reported") && (
              <PendingLine
                key={link.status}
                lines={[link.status === "reported" ? "Confirming the run with GitHub…" : "Watching GitHub for your run…"]}
                stillAfterMs={60_000}
                slowAfterMs={180_000}
                still="Runs usually take a minute or two. This page keeps checking by itself."
                slow="Still running on GitHub. You can leave this page; the result will be here when you're back."
              />
            )}
          </div>

          {link.report && link.report.tests.length > 0 && (
            <div className="flex flex-col gap-2" aria-live="polite">
              <p className="font-condensed tabular text-sm font-semibold">
                {link.report.passed} of {link.report.tests.length} tests passed
              </p>
              <ul className="flex flex-col border-t border-border">
                {link.report.tests.map((t, i) => (
                  <li key={`${t.name}-${i}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 border-b border-border py-2 text-sm">
                    {t.outcome === "passed" ? (
                      <Check className="mt-0.5 size-4 text-success" aria-label="Passed" />
                    ) : t.outcome === "failed" ? (
                      <X className="mt-0.5 size-4 text-destructive" aria-label="Failed" />
                    ) : (
                      <CircleDashed className="mt-0.5 size-4 text-muted-foreground" aria-label="Skipped" />
                    )}
                    <span className="min-w-0">
                      {t.name.replace(/^test_/, "").replaceAll("_", " ")}
                      {t.message && (
                        <span className="mt-0.5 block font-mono text-xs break-words whitespace-pre-wrap text-destructive">
                          {t.message.split("\n")[0]}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
