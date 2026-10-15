"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigation-progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoadingButton } from "@/components/ui/loading-button";
import { PendingLine } from "@/components/ui/pending-line";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/ui/password-input";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { PASSWORD_RULE } from "@/lib/validations/password";
import type { z } from "zod";
import { rememberStart } from "@/lib/start-intent";

const FIELDS: Array<{
  name: keyof SignUpInput;
  label: string;
  type: string;
  autoComplete: string;
  placeholder?: string;
  /** Said under the field before anyone types, so the rule is never a surprise */
  hint?: string;
}> = [
  { name: "name", label: "Name", type: "text", autoComplete: "name", placeholder: "Your name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: PASSWORD_RULE },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
];

/** The sign-up form. The page around it renders on the server */
export function SignUpForm({ start }: { start?: string }) {
  // Kept before any sign-up path, Google and GitHub included, so onboarding can pre-select it
  useEffect(() => rememberStart(start), [start]);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput, unknown, z.output<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    // Checked as each field is left, then live while it's being fixed
    mode: "onTouched",
  });

  // Where the form is taking the new learner, once the account exists (it stays busy until then)
  const [leaving, setLeaving] = useState<"signin" | "app" | null>(null);

  const onSubmit = async (data: z.output<typeof signUpSchema>) => {
    if (isLoading) return;
    let leavingNow = false;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "We couldn't create your account. Please try again.");
        return;
      }

      // With email verification on, the account opens from the link in the inbox
      if (result.needsVerification) {
        leavingNow = true;
        setLeaving("signin");
        startNavigation();
        router.push("/auth/signin?check=1");
        return;
      }

      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      leavingNow = true;
      setLeaving("app");
      startNavigation();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      if (!leavingNow) setIsLoading(false);
    }
  };

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {error && <FormError message={error} />}

      {FIELDS.map((f, i) => {
        const Field = f.type === "password" ? PasswordInput : Input;
        const hintId = f.hint ? `${f.name}-hint` : undefined;
        const errorId = errors[f.name] ? `${f.name}-error` : undefined;
        return (
          <div key={f.name} className="flex flex-col gap-2">
            <Label htmlFor={f.name}>{f.label}</Label>
            <Field
              id={f.name}
              {...(f.type === "password"
                ? { what: f.name === "confirmPassword" ? "confirmation" : "password" }
                : { type: f.type })}
              autoComplete={f.autoComplete}
              // The phone keyboard's Enter key moves on, then submits from the last field
              enterKeyHint={i === FIELDS.length - 1 ? "go" : "next"}
              placeholder={f.placeholder}
              disabled={isLoading}
              aria-invalid={Boolean(errors[f.name])}
              aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
              {...register(f.name)}
            />
            {errors[f.name] ? (
              <p id={errorId} className="text-sm text-destructive">
                {errors[f.name]?.message}
              </p>
            ) : (
              f.hint && (
                <p id={hintId} className="text-sm text-muted-foreground">
                  {f.hint}
                </p>
              )
            )}
          </div>
        );
      })}

      <LoadingButton
        type="submit"
        size="lg"
        className="mt-2 w-full"
        loading={isLoading}
        loadingText={leaving === "signin" ? "Taking you to sign in…" : leaving === "app" ? "Opening pylearn…" : "Creating your account…"}
      >
        Create account
      </LoadingButton>
      {isLoading && !leaving && (
        <PendingLine
          className="self-center"
          delayMs={900}
          stepMs={1800}
          lines={["Saving your details…", "Sending your confirmation email…"]}
          still="Email can take a few seconds to send."
        />
      )}
    </form>
  );
}
