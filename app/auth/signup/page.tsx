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
import { AuthShell, FormError } from "@/components/auth/auth-shell";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";

export default function SignUpPage() {
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

  const fields: Array<{
    name: keyof SignUpInput;
    label: string;
    type: string;
    autoComplete: string;
    placeholder?: string;
  }> = [
    { name: "name", label: "Name", type: "text", autoComplete: "name", placeholder: "Your name" },
    {
      name: "email",
      label: "Email",
      type: "email",
      autoComplete: "email",
      placeholder: "you@example.com",
    },
    { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
    {
      name: "confirmPassword",
      label: "Confirm password",
      type: "password",
      autoComplete: "new-password",
    },
  ];

  return (
    <AuthShell
      title="Tie on the white belt."
      lede="You start at 16 kyu. Pass your first module's grading and the first stripe goes on."
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Already training?{" "}
            <Link href="/auth/signin" className="font-medium text-primary underline">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {error && <FormError message={error} />}

          {fields.map((f) => (
            <div key={f.name} className="flex flex-col gap-2">
              <Label htmlFor={f.name}>{f.label}</Label>
              <Input
                id={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                placeholder={f.placeholder}
                disabled={isLoading}
                aria-invalid={Boolean(errors[f.name])}
                {...register(f.name)}
              />
              {errors[f.name] && (
                <p className="text-sm text-destructive">{errors[f.name]?.message}</p>
              )}
            </div>
          ))}

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
            {isLoading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {isLoading ? "Creating your account…" : "Create account"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
