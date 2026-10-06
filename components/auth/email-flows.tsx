"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/auth-shell";

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? { ok: true } : { ok: false, error: data.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "We couldn't reach the server. Check your connection." };
  }
}

function Done({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-success/35 bg-success/6 p-4 text-sm">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

/** Confirm an email with a button press (link scanners open links; they don't press buttons) */
export function VerifyEmailForm({ token }: { token: string }) {
  const [state, setState] = React.useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function confirm() {
    setState("busy");
    const r = await post("/api/auth/verify", { token });
    if (r.ok) setState("done");
    else {
      setError(r.error ?? null);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <Done>
        <p className="font-semibold">Email confirmed.</p>
        <Button asChild className="w-fit">
          <Link href="/auth/signin?verified=1">Sign in</Link>
        </Button>
      </Done>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {error && <FormError message={error} />}
      <Button size="lg" onClick={() => void confirm()} disabled={state === "busy" || !token} className="w-full">
        {state === "busy" && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        Confirm my email
      </Button>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("busy");
    const r = await post("/api/auth/password/forgot", { email });
    if (r.ok) setState("sent");
    else {
      setError(r.error ?? null);
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <Done>
        <p className="font-semibold">Check your inbox.</p>
        <p className="text-muted-foreground">
          If {email} has a pylearn password, a reset link is on its way. It works for an hour.
        </p>
      </Done>
    );
  }
  return (
    // The browser's own email check explains what's wrong with an address, so it stays on
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-5">
      {error && <FormError message={error} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={state === "busy" || !email.includes("@")}>
        {state === "busy" && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        Send the reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setError(null);
    setBusy(true);
    const r = await post("/api/auth/password/reset", { token, password });
    setBusy(false);
    if (r.ok) router.push("/auth/signin?reset=1");
    else setError(r.error ?? null);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-5" noValidate>
      {error && <FormError message={error} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-password">New password</Label>
        <Input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-confirm">Confirm new password</Label>
        <Input id="reset-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy || !token}>
        {busy && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        Set the new password
      </Button>
    </form>
  );
}

/** "Didn't get it?" on the sign-in and sign-up screens */
export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = React.useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);
  if (state === "sent") return <p className="text-sm text-success">A new link is on its way to {email}.</p>;
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const r = await post("/api/auth/verify/resend", { email });
          if (r.ok) setState("sent");
          else {
            setError(r.error ?? null);
            setState("idle");
          }
        }}
      >
        Send the link again
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
