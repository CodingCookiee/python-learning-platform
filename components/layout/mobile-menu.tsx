"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface MobileMenuProps {
  isAuthenticated: boolean;
  userName?: string | null;
  userEmail?: string | null;
  onSignOut: () => Promise<void>;
}

export function MobileMenu({ isAuthenticated, userName, userEmail, onSignOut }: MobileMenuProps) {
  const [open, setOpen] = React.useState(false);

  const close = () => setOpen(false);

  return (
    <div className="flex md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
      </Button>

      {open && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full z-50 border-b border-border/60 bg-background/95 backdrop-blur-md shadow-lg"
          role="dialog"
          aria-label="Mobile navigation"
        >
          <nav
            className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6 lg:px-8"
            aria-label="Mobile main navigation"
          >
            <Link
              href="/#features"
              onClick={close}
              className="px-3 py-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="/#curriculum"
              onClick={close}
              className="px-3 py-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
            >
              Curriculum
            </Link>
            <Link
              href="/modules"
              onClick={close}
              className="px-3 py-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
            >
              Modules
            </Link>

            <div className="my-2 h-px bg-border" />

            {isAuthenticated ? (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold tracking-widest uppercase text-foreground">
                    {userName ?? "Account"}
                  </p>
                  {userEmail && <p className="mt-0.5 text-xs text-muted-foreground">{userEmail}</p>}
                </div>
                <Link
                  href="/dashboard"
                  onClick={close}
                  className="px-3 py-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 px-3 py-2">
                  <ThemeToggle />
                  <form action={onSignOut}>
                    <Button variant="ghost" size="sm" type="submit">
                      Sign Out
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row">
                <Button variant="ghost" size="sm" asChild className="justify-start">
                  <Link href="/auth/signin" onClick={close}>
                    Sign In
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/signup" onClick={close}>
                    Get Started
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
