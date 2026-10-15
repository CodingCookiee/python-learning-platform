"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";

/**
 * Lifts a sign-up block. Blocks are kept as fingerprints, not addresses, so there's no list to
 * pick from: the admin types the address and it's checked against them.
 */
export function UnblockEmail({ blocked }: { blocked: number }) {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const id = React.useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/blocked-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      setResult(
        res.ok
          ? { ok: true, message: data.message ?? "Lifted." }
          : { ok: false, message: data.error ?? "That didn't work." }
      );
      if (res.ok) setEmail("");
    } catch {
      setResult({ ok: false, message: "We couldn't reach the server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-heading`} className="text-lg font-semibold">
          Blocked addresses
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {blocked === 0
            ? "None. Deleting an account can bar its address from signing up again."
            : `${blocked} ${blocked === 1 ? "address is" : "addresses are"} barred from signing up. Only a fingerprint of each is kept, so to let one back in, type it here.`}
        </p>
      </div>
      {blocked > 0 && (
        <form method="post" onSubmit={(e) => void submit(e)} className="flex max-w-xl flex-wrap items-end gap-2">
          <div className="flex min-w-60 flex-1 flex-col gap-1.5">
            <Label htmlFor={id}>Email address</Label>
            <Input
              id={id}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <LoadingButton
            type="submit"
            variant="outline"
            loading={busy}
            loadingText="Checking…"
            disabled={!email.includes("@")}
          >
            Let it sign up again
          </LoadingButton>
        </form>
      )}
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
          {result.message}
        </p>
      )}
    </section>
  );
}
