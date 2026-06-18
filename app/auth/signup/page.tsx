"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { Terminal, Code2, Rocket, Sparkles } from "lucide-react";

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
        setError(result.error || "Registration failed");
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
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-background to-primary/10 flex-col items-center justify-center p-12">
        <div className="max-w-md space-y-12">
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-primary/20">
              <Terminal className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-4xl font-heading font-bold tracking-tight">
              Master Python in 4 Weeks
            </h1>
            <p className="text-lg text-muted-foreground">
              with 16 comprehensive modules designed for maximum learning
            </p>
          </div>

          {/* Features Grid */}
          <div className="space-y-5">
            {/* Feature 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/20 text-primary">
                  <Code2 className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Interactive Lessons</h3>
                <p className="text-sm text-muted-foreground">
                  Learn through hands-on examples and real-world scenarios
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/20 text-primary">
                  <Rocket className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Real Projects</h3>
                <p className="text-sm text-muted-foreground">
                  Build 16 portfolio-ready projects from fundamentals to advanced
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/20 text-primary">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Track Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Unlock achievements, earn XP, and watch your skills grow
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">16</div>
              <p className="text-xs text-muted-foreground mt-1">Modules</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">4</div>
              <p className="text-xs text-muted-foreground mt-1">Weeks</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">100%</div>
              <p className="text-xs text-muted-foreground mt-1">Hands-on</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile Header */}
          <div className="lg:hidden text-center space-y-2 mb-8">
            <h1 className="text-3xl font-heading font-bold tracking-tight">Get Started</h1>
            <p className="text-sm text-muted-foreground">
              Create your account and begin mastering Python today
            </p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold">Create Account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in your details to get started
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                disabled={isLoading}
                className="h-10"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                disabled={isLoading}
                className="h-10"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                className="h-10"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                className="h-10"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive font-medium">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full h-10 mt-6" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-background text-muted-foreground">or</span>
            </div>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="font-semibold text-primary hover:underline transition-all"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
