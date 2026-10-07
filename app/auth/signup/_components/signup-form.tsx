"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/auth/auth-shell";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";

const FIELDS: Array<{
  name: keyof SignUpInput;
  label: string;
  type: string;
  autoComplete: string;
  placeholder?: string;
}> = [
  { name: "name", label: "Name", type: "text", autoComplete: "name", placeholder: "Your name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
];

/** The sign-up form. The page around it renders on the server */
export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpInput) => {
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
        router.push("/auth/signin?check=1");
        return;
      }

      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

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
      {error && <FormError message={error} />}

      {FIELDS.map((f, i) => (
        <div key={f.name} className="flex flex-col gap-2">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input
            id={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            // The phone keyboard's Enter key moves on, then submits from the last field
            enterKeyHint={i === FIELDS.length - 1 ? "go" : "next"}
            placeholder={f.placeholder}
            disabled={isLoading}
            aria-invalid={Boolean(errors[f.name])}
            {...register(f.name)}
          />
          {errors[f.name] && <p className="text-sm text-destructive">{errors[f.name]?.message}</p>}
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <label htmlFor="ageConfirmed" className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            id="ageConfirmed"
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-primary"
            disabled={isLoading}
            aria-invalid={Boolean(errors.ageConfirmed)}
            aria-describedby={errors.ageConfirmed ? "ageConfirmed-error" : undefined}
            {...register("ageConfirmed")}
          />
          <span>I&apos;m 16 or older</span>
        </label>
        {errors.ageConfirmed && (
          <p id="ageConfirmed-error" className="text-sm text-destructive">
            {errors.ageConfirmed.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
        {isLoading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {isLoading ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}
