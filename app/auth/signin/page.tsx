"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, FormError } from "@/components/auth/auth-shell";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { ResendVerification } from "@/components/auth/email-flows";

function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const params = useSearchParams();
  const notice = params.get("verified")
    ? "Email confirmed. Sign in to start training."
    : params.get("reset")
      ? "Password changed. Sign in with the new one."
      : params.get("check")
        ? "Check your inbox: we sent a link to confirm your email."
        : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInInput) => {
    setIsLoading(true);
    setError(null);
    setUnverifiedEmail(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "unverified") {
          setError("Confirm your email first: the link is in your inbox.");
          setUnverifiedEmail(data.email);
        } else if (result.code === "rate_limited") {
          setError("Too many sign-in attempts. Wait 15 minutes, or reset your password.");
        } else {
          setError("That email and password don't match. Check them and try again.");
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Back to the mat."
      lede="Your belt, stripes and streak are where you left them."
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/auth/signup" className="font-medium text-primary underline">
              Create an account
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {notice && !error && (
            <p role="status" className="rounded-sm border border-success/35 bg-success/6 px-3 py-2.5 text-sm text-success">
              {notice}
            </p>
          )}
          {error && <FormError message={error} />}
          {unverifiedEmail && <ResendVerification email={unverifiedEmail} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              disabled={isLoading}
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <span className="flex items-baseline justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/auth/forgot-password" className="text-sm text-muted-foreground underline hover:text-foreground">
                Forgot it?
              </Link>
            </span>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
            {isLoading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {isLoading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}

// useSearchParams needs a Suspense boundary so the page can still be prerendered
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
