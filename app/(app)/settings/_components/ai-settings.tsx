"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DEFAULT_MODEL, MODEL_SUGGESTIONS, PROVIDER_LABEL, PROVIDERS, type Provider } from "@/lib/ai/gateway";
import type { CredentialSummary, UsageSummary } from "@/lib/ai/credentials";

type Status = { type: "success" | "error"; message: string } | null;

const KEY_PAGE: Record<Provider, { href: string; label: string; prefix: string }> = {
  anthropic: { href: "https://console.anthropic.com/settings/keys", label: "console.anthropic.com", prefix: "sk-ant-" },
  openai: { href: "https://platform.openai.com/api-keys", label: "platform.openai.com", prefix: "sk-" },
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
  const [apiKey, setApiKey] = React.useState("");
  const [busy, setBusy] = React.useState<"save" | "test" | "remove" | null>(null);
  const [status, setStatus] = React.useState<Status>(null);

  const keepsKey = credential !== null && credential.provider === provider;

  function chooseProvider(next: Provider) {
    setProvider(next);
    // Switching provider starts from its default model, unless coming back to the saved one
    setModel(credential?.provider === next ? credential.model : DEFAULT_MODEL[next]);
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
    try {
      const res = await fetch("/api/settings/ai/test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { model?: string; error?: string };
      setStatus(
        res.ok
          ? { type: "success", message: `The key works with ${data.model}.` }
          : { type: "error", message: data.error ?? "The test call failed." }
      );
    } catch {
      setStatus({ type: "error", message: "We couldn't reach the server." });
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
        setStatus({ type: "success", message: "Key removed from pylearn." });
      } else setStatus({ type: "error", message: "The key wasn't removed. Try again." });
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
            <Button type="button" variant="outline" size="sm" onClick={() => void test()} disabled={busy !== null}>
              {busy === "test" && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Test
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void remove()} disabled={busy !== null}>
              Remove
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Provider</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Provider">
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="ai-model">Model</Label>
          <Input
            id="ai-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            list="ai-model-suggestions"
            spellCheck={false}
            autoComplete="off"
            className="font-mono text-sm"
          />
          <datalist id="ai-model-suggestions">
            {MODEL_SUGGESTIONS[provider].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <p className="text-sm text-muted-foreground">Any model your key can use. Bigger models tutor better and cost more.</p>
        </div>

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
            <a href={KEY_PAGE[provider].href} target="_blank" rel="noreferrer" className="text-primary underline">
              {KEY_PAGE[provider].label}
            </a>{" "}
            and set a spend limit there. It&apos;s encrypted on our server, used only for your tutor calls, and never
            shown again.
          </p>
        </div>

        <StatusLine status={status} />
        <Button type="submit" disabled={busy !== null} className="w-fit">
          {busy === "save" ? "Saving…" : credential ? "Save changes" : "Save key"}
        </Button>
      </form>

      <p className="font-condensed tabular text-sm text-muted-foreground">
        Today {fmt(usage.today.calls)} of {usage.dailyLimit} calls · {fmt(usage.today.input)} tokens in,{" "}
        {fmt(usage.today.output)} out. This month {fmt(usage.month.calls)} calls · {fmt(usage.month.input)} in,{" "}
        {fmt(usage.month.output)} out.
      </p>
    </div>
  );
}
