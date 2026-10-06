"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/auth-shell";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { ResendVerification } from "@/components/auth/email-flows";

/** The sign-in form. The page around it renders on the server and passes in any notice from the URL */
export function SignInForm({ notice }: { notice: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

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
          enterKeyHint="next"
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
          enterKeyHint="go"
          disabled={isLoading}
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
        {isLoading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
