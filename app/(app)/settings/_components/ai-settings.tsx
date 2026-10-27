"use client";

import * as React from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { SnagMark } from "@/components/brand/marks";
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
      // A problem is announced at once; a confirmation waits its turn
      role={status.type === "error" ? "alert" : "status"}
      className={cn("flex items-center gap-2 text-sm", status.type === "success" ? "text-success" : "text-destructive")}
    >
      {status.type === "success" ? (
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <SnagMark className="size-4 shrink-0" />
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

type Busy = { action: "save" | "test" | "remove" | "default"; provider: Provider } | null;

export function AiSettings({
  initialCredentials,
  usage,
  available,
}: {
  initialCredentials: CredentialSummary[];
  usage: UsageSummary;
  available: boolean;
}) {
  const [credentials, setCredentials] = React.useState(initialCredentials);
  // The form edits one provider's key: the default's to start with, or Anthropic before there are any
  const first = initialCredentials.find((c) => c.isDefault) ?? initialCredentials[0];
  const [provider, setProvider] = React.useState<Provider>(first?.provider ?? "anthropic");
  const [model, setModel] = React.useState(first?.model ?? DEFAULT_MODEL.anthropic);
  // "Another model": a model id typed by hand instead of one of the suggestions
  const [custom, setCustom] = React.useState(() => isCustom(first?.provider ?? "anthropic", model));
  // Focus the model id box when the learner picks "Another model", not when the page loads with one saved
  const modelInput = React.useRef<HTMLInputElement>(null);
  const focusModel = React.useRef(false);
  React.useEffect(() => {
    if (custom && focusModel.current) modelInput.current?.focus();
    focusModel.current = false;
  }, [custom]);
  const [apiKey, setApiKey] = React.useState("");
  const [busy, setBusy] = React.useState<Busy>(null);
  const [status, setStatus] = React.useState<Status>(null);
  // A key test's answer, shown under the key it's about rather than under the form
  const [testResult, setTestResult] = React.useState<{ provider: Provider; status: Status } | null>(null);

  const saved = credentials.find((c) => c.provider === provider) ?? null;
  // Something to save: a new key, or a model other than the saved one
  const changed = apiKey.trim() !== "" || (saved !== null && saved.model !== model.trim());
  const isBusy = (action: NonNullable<Busy>["action"], p: Provider) => busy?.action === action && busy.provider === p;

  function chooseProvider(next: Provider) {
    setProvider(next);
    setApiKey("");
    setStatus(null);
    // A provider with a key opens on its model; one without starts from its default model
    const nextModel = credentials.find((c) => c.provider === next)?.model ?? DEFAULT_MODEL[next];
    setModel(nextModel);
    setCustom(isCustom(next, nextModel));
  }

  async function put(body: { provider: Provider; model: string; apiKey?: string; isDefault?: boolean }) {
    const res = await fetch("/api/settings/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { credentials?: CredentialSummary[]; error?: string };
    if (res.ok && data.credentials) setCredentials(data.credentials);
    return res.ok && data.credentials ? null : (data.error ?? "That didn't save.");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!saved && !apiKey.trim()) {
      setStatus({ type: "error", message: `Paste your ${PROVIDER_LABEL[provider]} API key.` });
      return;
    }
    setBusy({ action: "save", provider });
    setStatus(null);
    try {
      const error = await put({ provider, model: model.trim(), ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) });
      if (error) {
        setStatus({ type: "error", message: error });
        return;
      }
      setApiKey("");
      setStatus({ type: "success", message: `Saved your ${PROVIDER_LABEL[provider]} key. Use Test to check it works.` });
    } catch {
      setStatus({ type: "error", message: "We couldn't reach the server." });
    } finally {
      setBusy(null);
    }
  }

  async function makeDefault(c: CredentialSummary) {
    setBusy({ action: "default", provider: c.provider });
    setStatus(null);
    try {
      const error = await put({ provider: c.provider, model: c.model, isDefault: true });
      setStatus(
        error
          ? { type: "error", message: error }
          : { type: "success", message: `${PROVIDER_LABEL[c.provider]} answers wherever you haven't picked a model.` }
      );
    } catch {
      setStatus({ type: "error", message: "We couldn't reach the server." });
    } finally {
      setBusy(null);
    }
  }

  async function test(p: Provider) {
    setBusy({ action: "test", provider: p });
    setStatus(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p }),
      });
      const data = (await res.json().catch(() => ({}))) as { model?: string; error?: string };
      setTestResult({
        provider: p,
        status: res.ok
          ? { type: "success", message: `The key works with ${data.model}.` }
          : { type: "error", message: data.error ?? "The test call failed." },
      });
    } catch {
      setTestResult({ provider: p, status: { type: "error", message: "We couldn't reach the server." } });
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: Provider) {
    setBusy({ action: "remove", provider: p });
    setStatus(null);
    try {
      const res = await fetch(`/api/settings/ai?provider=${p}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { credentials?: CredentialSummary[] };
      if (res.ok && data.credentials) {
        setCredentials(data.credentials);
        if (testResult?.provider === p) setTestResult(null);
        if (provider === p) setApiKey("");
        setStatus({ type: "success", message: `Your ${PROVIDER_LABEL[p]} key is removed from pylearn.` });
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
        AI help isn&apos;t switched on for this site yet. Lessons and drills work without it.
      </p>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-5">
      {credentials.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Your AI keys">
          {credentials.map((c) => (
            <li key={c.provider} className="flex flex-col gap-2">
              {/* The details get the card's full width; the actions sit on their own row under them, so a long
                  model id isn't squeezed into a narrow column beside three buttons */}
              <div className="flex flex-col gap-3 rounded-md border border-border bg-sheet p-4 text-sm">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                      {PROVIDER_LABEL[c.provider]}
                      {c.isDefault && credentials.length > 1 && (
                        <span className="rounded-sm border border-primary/40 px-1.5 text-xs font-semibold text-primary">
                          Default
                        </span>
                      )}
                    </span>
                    <span className="flex flex-wrap gap-x-2 text-muted-foreground">
                      <span className="font-mono text-[0.8125rem] break-all text-foreground">{c.model}</span>
                      <span>
                        · Key ending <span className="font-mono">{c.keyHint}</span>
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-7">
                  {!c.isDefault && (
                    <LoadingButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void makeDefault(c)}
                      loading={isBusy("default", c.provider)}
                      loadingText="Saving…"
                      disabled={busy !== null && !isBusy("default", c.provider)}
                    >
                      Use by default
                    </LoadingButton>
                  )}
                  <LoadingButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void test(c.provider)}
                    loading={isBusy("test", c.provider)}
                    loadingText="Testing…"
                    disabled={busy !== null && !isBusy("test", c.provider)}
                    aria-label={`Test the ${PROVIDER_LABEL[c.provider]} key`}
                  >
                    Test
                  </LoadingButton>
                  <LoadingButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void remove(c.provider)}
                    loading={isBusy("remove", c.provider)}
                    loadingText="Removing…"
                    disabled={busy !== null && !isBusy("remove", c.provider)}
                    aria-label={`Remove the ${PROVIDER_LABEL[c.provider]} key`}
                  >
                    Remove
                  </LoadingButton>
                </div>
              </div>
              {/* The test's progress and its answer sit right under the key they're about */}
              {isBusy("test", c.provider) && (
                <PendingLine
                  lines={[`Calling ${PROVIDER_LABEL[c.provider]} with your key…`, "Waiting for its answer…"]}
                  still="Some providers take a few seconds to answer."
                  slow="Still waiting: the test gives up after 30 seconds."
                />
              )}
              {testResult?.provider === c.provider && !isBusy("test", c.provider) && <StatusLine status={testResult.status} />}
            </li>
          ))}
        </ul>
      )}

      <form method="post" onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">
            {credentials.length === 0 ? "Provider" : "Add or change a key"}
          </legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Provider">
            {PROVIDERS.map((p) => {
              const has = credentials.some((c) => c.provider === p);
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={provider === p}
                  onClick={() => chooseProvider(p)}
                  className={cn(
                    "flex flex-col rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
                    provider === p ? "border-primary bg-accent/60" : "border-border hover:border-foreground/35"
                  )}
                >
                  {PROVIDER_LABEL[p]}
                  <span className="text-xs font-normal text-muted-foreground">{has ? "Key saved" : "No key"}</span>
                </button>
              );
            })}
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
          <Label htmlFor="ai-key">{PROVIDER_LABEL[provider]} API key</Label>
          <Input
            id="ai-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={saved ? `Leave blank to keep the key ending ${saved.keyHint}` : `${KEY_PAGE[provider].prefix}…`}
            autoComplete="off"
            spellCheck={false}
            className={cn("text-sm", apiKey && "font-mono")}
          />
          <p className="text-sm text-muted-foreground">
            Create one at{" "}
            <a href={KEY_PAGE[provider].href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {KEY_PAGE[provider].label}
            </a>{" "}
            and set a spend limit there. It&apos;s encrypted on our server, used only for your own AI calls, and never
            shown again.
          </p>
        </div>

        <StatusLine status={status} />
        <LoadingButton
          type="submit"
          variant={changed || !saved ? "default" : "outline"}
          loading={busy?.action === "save"}
          loadingText="Saving…"
          disabled={busy !== null && busy.action !== "save"}
          className="w-fit"
        >
          {saved ? `Save ${PROVIDER_LABEL[provider]} changes` : `Save ${PROVIDER_LABEL[provider]} key`}
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
