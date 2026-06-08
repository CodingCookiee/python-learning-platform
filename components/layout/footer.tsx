import Link from "next/link";
import { Terminal } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            PyLearn
          </span>
        </div>

        {/* Copyright */}
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PyLearn. Built for JavaScript developers.
        </p>

        {/* Nav links */}
        <nav className="flex gap-4" aria-label="Footer navigation">
          <Link
            href="/auth/signin"
            className="text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign Up
          </Link>
          <Link
            href="/modules"
            className="text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            Modules
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </footer>
  );
}
