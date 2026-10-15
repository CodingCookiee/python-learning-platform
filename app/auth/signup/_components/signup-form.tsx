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
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/password-input";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { PASSWORD_RULE } from "@/lib/validations/password";
import type { z } from "zod";
import { rememberStart } from "@/lib/start-intent";

/**
 * Every field keeps a line under it for its hint or its error, so a message appearing or clearing
 * never changes the form's height: nothing jumps while the learner fills it in.
 */
function FieldNote({
  id,
  error,
  hint,
  lines = 1,
  className,
}: {
  id: string;
  error?: string;
  hint?: string;
  lines?: 1 | 2;
  className?: string;
}) {
  return (
    <p
      id={id}
      className={cn(
        "text-sm leading-5",
        lines === 2 ? "min-h-10" : "min-h-5",
        error ? "text-destructive" : "text-muted-foreground",
        className
      )}
    >
      {error ?? hint}
    </p>
  );
}

const FIELD_NAMES: ReadonlyArray<keyof SignUpInput> = ["name", "email", "password", "confirmPassword"];

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
    setError: setFieldError,
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
        const message = result.error || "We couldn't create your account. Please try again.";
        // A refusal about one field (a breached password, a taken email) shows in that field's note,
        // in the line already kept for it; anything else goes under the button
        if (result.field && FIELD_NAMES.includes(result.field)) {
          setFieldError(result.field, { type: "server", message }, { shouldFocus: true });
        } else {
          setError(message);
        }
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
    <form method="post" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          enterKeyHint="next"
          placeholder="Your name"
          disabled={isLoading}
          aria-invalid={Boolean(errors.name)}
          aria-describedby="name-note"
          {...register("name")}
        />
        <FieldNote id="name-note" error={errors.name?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          enterKeyHint="next"
          placeholder="you@example.com"
          disabled={isLoading}
          aria-invalid={Boolean(errors.email)}
          aria-describedby="email-note"
          {...register("email")}
        />
        <FieldNote id="email-note" error={errors.email?.message} />
      </div>

      {/* The pair side by side, sharing one note: the rule first, then whichever needs fixing */}
      <div className="grid gap-x-3 gap-y-1.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            what="password"
            autoComplete="new-password"
            enterKeyHint="next"
            disabled={isLoading}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-note"
            {...register("password")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            what="confirmation"
            autoComplete="new-password"
            enterKeyHint="go"
            disabled={isLoading}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby="password-note"
            {...register("confirmPassword")}
          />
        </div>
        <FieldNote
          id="password-note"
          lines={2}
          className="sm:col-span-2"
          error={errors.password?.message ?? errors.confirmPassword?.message}
          hint={PASSWORD_RULE}
        />
      </div>

      <LoadingButton
        type="submit"
        size="lg"
        className="mt-1 w-full"
        loading={isLoading}
        loadingText={leaving === "signin" ? "Taking you to sign in…" : leaving === "app" ? "Opening pylearn…" : "Creating your account…"}
      >
        Create account
      </LoadingButton>
      {/* Under the button, so a refusal adds to the foot of the form and nothing above it moves */}
      {error && <FormError message={error} />}
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
