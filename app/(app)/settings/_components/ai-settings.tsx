"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { PendingLine } from "@/components/ui/pending-line";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DEFAULT_MODEL, MODEL_SUGGESTIONS, PROVIDER_LABEL, PROVIDERS, type Provider } from "@/lib/ai/gateway";
import type { CredentialSummary, UsageSummary } from "@/lib/ai/credentials";

type Status = { type: "success" | "error"; message: string } | null;

const KEY_PAGE: Record<Provider, { href: string; label: string; prefix: string }> = {
  anthropic: { href: "https://console.anthropic.com/settings/keys", label: "console.anthropic.com", prefix: "sk-ant-" },
  openai: { href: "https://platform.openai.com/api-keys", label: "platform.openai.com", prefix: "sk-" },
  gemini: { href: "https://aistudio.google.com/apikey", label: "aistudio.google.com", prefix: "AIza" },
};

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role="status"
      className={cn("flex items-center gap-2 text-sm", status.type === "success" ? "text-success" : "text-destructive")}
    >
      {status.type === "success" ? (
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      )}
      {status.message}
    </p>
  );
}

const fmt = (n: number) => n.toLocaleString();

function isCustom(provider: Provider, model: string): boolean {
  return !MODEL_SUGGESTIONS[provider].some((m) => m.id === model);
}

function ModelOption({
  checked,
  onSelect,
  name,
  detail,
  note,
}: {
  checked: boolean;
  onSelect: () => void;
  name: string;
  detail?: string;
  note: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-colors",
        checked ? "border-primary bg-accent/60" : "border-border hover:border-foreground/35"
      )}
    >
      <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
        {name}
        {detail && <span className="font-mono text-xs font-normal text-muted-foreground">{detail}</span>}
      </span>
      <span className="text-sm text-muted-foreground">{note}</span>
    </button>
  );
}

export function AiSettings({
  initialCredential,
  usage,
  available,
}: {
  initialCredential: CredentialSummary | null;
  usage: UsageSummary;
  available: boolean;
}) {
  const [credential, setCredential] = React.useState(initialCredential);
  const [provider, setProvider] = React.useState<Provider>(initialCredential?.provider ?? "anthropic");
  const [model, setModel] = React.useState(initialCredential?.model ?? DEFAULT_MODEL.anthropic);
  // "Another model": a model id typed by hand instead of one of the suggestions
  const [custom, setCustom] = React.useState(() => isCustom(initialCredential?.provider ?? "anthropic", model));
  // Focus the model id box when the learner picks "Another model", not when the page loads with one saved
  const modelInput = React.useRef<HTMLInputElement>(null);
  const focusModel = React.useRef(false);
  React.useEffect(() => {
    if (custom && focusModel.current) modelInput.current?.focus();
    focusModel.current = false;
  }, [custom]);
  const [apiKey, setApiKey] = React.useState("");
  const [busy, setBusy] = React.useState<"save" | "test" | "remove" | null>(null);
  const [status, setStatus] = React.useState<Status>(null);
  // The key test's answer, shown beside the key rather than under the form
  const [testResult, setTestResult] = React.useState<Status>(null);

  const keepsKey = credential !== null && credential.provider === provider;

  function chooseProvider(next: Provider) {
    setProvider(next);
    // Switching provider starts from its default model, unless coming back to the saved one
    const nextModel = credential?.provider === next ? credential.model : DEFAULT_MODEL[next];
    setModel(nextModel);
    setCustom(isCustom(next, nextModel));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!keepsKey && !apiKey.trim()) {
      setStatus({ type: "error", message: `Paste your ${PROVIDER_LABEL[provider]} API key.` });
      return;
    }
    setBusy("save");
    setStatus(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model: model.trim(), ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as { credential?: CredentialSummary; error?: string };
      if (!res.ok || !data.credential) {
        setStatus({ type: "error", message: data.error ?? "That didn't save." });
        return;
      }
      setCredential(data.credential);
      setApiKey("");
      setStatus({ type: "success", message: "Saved. Use Test to check the key works." });
    } catch {
      setStatus({ type: "error", message: "We couldn't reach the server." });
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setStatus(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/ai/test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { model?: string; error?: string };
      setTestResult(
        res.ok
          ? { type: "success", message: `The key works with ${data.model}.` }
          : { type: "error", message: data.error ?? "The test call failed." }
      );
    } catch {
      setTestResult({ type: "error", message: "We couldn't reach the server." });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    setStatus(null);
    try {
      const res = await fetch("/api/settings/ai", { method: "DELETE" });
      if (res.ok) {
        setCredential(null);
        setTestResult(null);
        setStatus({ type: "success", message: "Key removed from pylearn." });
      } else setStatus({ type: "error", message: "The key wasn't removed. Try again." });
    } catch {
      setStatus({ type: "error", message: "We couldn't reach the server, so the key is still here." });
    } finally {
      setBusy(null);
    }
  }

  if (!available) {
    return (
      <p className="max-w-md text-sm text-muted-foreground">
        The tutor needs the server&apos;s <code>ENCRYPTION_KEY</code> to store keys safely, and it isn&apos;t set
        yet.
      </p>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-5">
      {credential && (
        <div className="flex items-start gap-3 rounded-md border border-border bg-sheet p-4 text-sm">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">
              {PROVIDER_LABEL[credential.provider]} · <span className="font-mono text-[0.8125rem]">{credential.model}</span>
            </span>
            <span className="text-muted-foreground">
              Key ending <span className="font-mono">{credential.keyHint}</span>
            </span>
          </div>
          <div className="flex shrink-0 gap-2">
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void test()}
              loading={busy === "test"}
              loadingText="Testing…"
              disabled={busy !== null && busy !== "test"}
            >
              Test
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void remove()}
              loading={busy === "remove"}
              loadingText="Removing…"
              disabled={busy !== null && busy !== "remove"}
            >
              Remove
            </LoadingButton>
          </div>
        </div>
      )}
      {/* The test's progress and its answer sit right under the key they're about */}
      {credential && busy === "test" && (
        <PendingLine
          lines={[`Calling ${PROVIDER_LABEL[credential.provider]} with your key…`, "Waiting for its answer…"]}
          still="Some providers take a few seconds to answer."
          slow="Still waiting: the test gives up after 30 seconds."
        />
      )}
      {credential && busy !== "test" && <StatusLine status={testResult} />}

      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Provider</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Provider">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={provider === p}
                onClick={() => chooseProvider(p)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
                  provider === p ? "border-primary bg-accent/60" : "border-border hover:border-foreground/35"
                )}
              >
                {PROVIDER_LABEL[p]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Model</legend>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Model">
            {MODEL_SUGGESTIONS[provider].map((m) => (
              <ModelOption
                key={m.id}
                checked={!custom && model === m.id}
                onSelect={() => {
                  setCustom(false);
                  setModel(m.id);
                }}
                name={m.name}
                detail={m.id}
                note={m.note}
              />
            ))}
            <ModelOption
              checked={custom}
              onSelect={() => {
                if (custom) return;
                setModel("");
                focusModel.current = true;
                setCustom(true);
              }}
              name="Another model"
              note="Type the id of any model your key can use."
            />
          </div>
          {custom && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-model" className="sr-only">
                Model id
              </Label>
              <Input
                id="ai-model"
                ref={modelInput}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={DEFAULT_MODEL[provider]}
                spellCheck={false}
                autoComplete="off"
                required
                className="font-mono text-sm"
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground">Bigger models tutor better and cost more per call.</p>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ai-key">API key</Label>
          <Input
            id="ai-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={keepsKey ? `Leave blank to keep the key ending ${credential!.keyHint}` : `${KEY_PAGE[provider].prefix}…`}
            autoComplete="off"
            spellCheck={false}
            className={cn("text-sm", apiKey && "font-mono")}
          />
          <p className="text-sm text-muted-foreground">
            Create one at{" "}
            <a href={KEY_PAGE[provider].href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {KEY_PAGE[provider].label}
            </a>{" "}
            and set a spend limit there. It&apos;s encrypted on our server, used only for your tutor calls, and never
            shown again.
          </p>
        </div>

        <StatusLine status={status} />
        <LoadingButton type="submit" loading={busy === "save"} loadingText="Saving…" disabled={busy !== null && busy !== "save"} className="w-fit">
          {credential ? "Save changes" : "Save key"}
        </LoadingButton>
      </form>

      <p className="font-condensed tabular text-sm text-muted-foreground">
        Today {fmt(usage.today.calls)} of {usage.dailyLimit} calls · {fmt(usage.today.input)} tokens in,{" "}
        {fmt(usage.today.output)} out. This month {fmt(usage.month.calls)} calls · {fmt(usage.month.input)} in,{" "}
        {fmt(usage.month.output)} out.
      </p>
    </div>
  );
}
