"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigation-progress";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Seal } from "@/components/brand/seal";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/auth-shell";

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok
      ? { ok: true }
      : { ok: false, error: data.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "We couldn't reach the server. Check your connection." };
  }
}

const noSubscribe = () => () => {};

/**
 * A link's one-time token (reset, confirm), taken out of the address bar once the page has it, so it
 * isn't left in the browser's history or on screen. Kept for this tab only, so a refresh still works,
 * and forgotten once used (`forget`).
 */
function useLinkToken(fromUrl: string, kind: "reset" | "verify") {
  const key = `link-token:${kind}`;
  const stored = React.useSyncExternalStore(
    noSubscribe,
    () => {
      try {
        return sessionStorage.getItem(key) ?? "";
      } catch {
        return "";
      }
    },
    () => ""
  );
  React.useEffect(() => {
    if (!fromUrl) return;
    try {
      sessionStorage.setItem(key, fromUrl);
    } catch {
      // Kept in this page only
    }
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [fromUrl, key]);
  const forget = React.useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Nothing kept
    }
  }, [key]);
  return { token: fromUrl || stored, forget };
}

function Done({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-success/35 bg-success/6 p-4 text-sm">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

/**
 * The email-confirmation page's content: a button press first (link scanners open links; they don't
 * press buttons), then a confirmed state that owns the page, with one full-width way on to sign in.
 * Its heading changes with it, so the page never asks to confirm what's already confirmed.
 */
export function VerifyEmailForm({ token: fromUrl }: { token: string }) {
  const { token, forget } = useLinkToken(fromUrl, "verify");
  const [state, setState] = React.useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);

  async function confirm() {
    setState("busy");
    const r = await post("/api/auth/verify", { token });
    if (r.ok) {
      forget();
      setState("done");
      // The page changed under the button that was pressed: put focus on what it says now
      requestAnimationFrame(() => heading.current?.focus());
    } else {
      setError(r.error ?? null);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-col gap-8">
        <Seal label="Confirmed" detail="Email" animate className="w-fit" />
        <div className="flex flex-col gap-2">
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-3xl font-semibold tracking-[-0.015em] outline-none"
          >
            You&apos;re all set.
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Your email is confirmed and your white belt is waiting. Sign in to start your first
            lesson.
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/auth/signin?verified=1">
            Sign in to start training
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">Confirm your email</h1>
        <p className="text-sm text-muted-foreground">
          Press the button to finish setting up your account.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {error && <FormError message={error} />}
        <LoadingButton
          size="lg"
          onClick={() => void confirm()}
          loading={state === "busy"}
          loadingText="Confirming…"
          disabled={!token}
          className="w-full"
        >
          Confirm my email
        </LoadingButton>
      </div>
      <p className="text-sm text-muted-foreground">
        <Link href="/auth/signin" className="font-medium text-primary underline">
          Back to sign in
        </Link>
      </p>
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
    <form method="post" onSubmit={(e) => void submit(e)} className="flex flex-col gap-5">
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
          // Held while the link is sent, so "check your inbox" names the address it went to
          readOnly={state === "busy"}
        />
      </div>
      <LoadingButton
        type="submit"
        size="lg"
        className="w-full"
        loading={state === "busy"}
        loadingText="Sending the link…"
        disabled={!email.includes("@")}
      >
        Send the reset link
      </LoadingButton>
    </form>
  );
}

export function ResetPasswordForm({ token: fromUrl }: { token: string }) {
  const { token, forget } = useLinkToken(fromUrl, "reset");
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // A reset link works once: never send it twice
    if (busy) return;
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setError(null);
    setBusy(true);
    const r = await post("/api/auth/password/reset", { token, password });
    if (r.ok) {
      forget();
      // Busy until sign-in replaces this form
      startNavigation();
      router.push("/auth/signin?reset=1");
      return;
    }
    setBusy(false);
    setError(r.error ?? null);
  }

  return (
    <form method="post" onSubmit={(e) => void submit(e)} className="flex flex-col gap-5" noValidate>
      {error && <FormError message={error} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-password">New password</Label>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-confirm">Confirm new password</Label>
        <Input
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <LoadingButton
        type="submit"
        size="lg"
        className="w-full"
        loading={busy}
        loadingText="Saving your new password…"
        disabled={!token}
      >
        Set the new password
      </LoadingButton>
    </form>
  );
}

/** "Didn't get it?" on the sign-in and sign-up screens */
export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = React.useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(null);
  if (state === "sent")
    return <p className="text-sm text-success">A new link is on its way to {email}.</p>;
  return (
    <div className="flex flex-col gap-1.5">
      <LoadingButton
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        loading={state === "busy"}
        loadingText="Sending…"
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
      </LoadingButton>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
