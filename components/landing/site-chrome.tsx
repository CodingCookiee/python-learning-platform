import { cache } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PROFILE_LINKS } from "@/lib/landing/structured-data";

/**
 * Whether the visitor is signed in, once per request (the header and footer both ask). The landing
 * page sends signed-in visitors to their dashboard, so on the other public pages (About, Contact,
 * Privacy, a certificate) its section links would bounce them there: signed in, they get the app's
 * own pages instead. Reading the session only decodes its cookie; no database query.
 */
const signedIn = cache(async () => Boolean((await auth())?.user));

const LINK = "text-muted-foreground hover:text-foreground";

export async function SiteHeader() {
  const member = await signedIn();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-6 px-gutter">
        <Link href={member ? "/dashboard" : "/"} aria-label={member ? "pylearn: your dashboard" : "pylearn home"} className="rounded-sm">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm md:flex">
          {member ? (
            <>
              <Link href="/modules" className={LINK}>
                Syllabus
              </Link>
              <Link href="/about" className={LINK}>
                How it works
              </Link>
              <Link href="/about#faq" className={LINK}>
                Questions
              </Link>
            </>
          ) : (
            <>
              <Link href="/#how-it-works" className={LINK}>
                How it works
              </Link>
              <Link href="/#syllabus" className={LINK}>
                Syllabus
              </Link>
              <Link href="/#bridge" className={LINK}>
                For JS developers
              </Link>
              <Link href="/#faq" className={LINK}>
                Questions
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {member ? (
            <Button size="sm" asChild>
              <Link href="/dashboard">Your dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/signin">
                  Sign in<span className="sr-only"> to your account</span>
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/signup">
                  <span className="sm:hidden">Start</span>
                  <span className="hidden sm:inline">Start free</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const member = await signedIn();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-page flex-col gap-6 px-gutter py-10 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {member ? (
            <>
              <Link href="/dashboard" className={LINK}>
                Dashboard
              </Link>
              <Link href="/modules" className={LINK}>
                Syllabus
              </Link>
            </>
          ) : (
            <>
              <Link href="/#syllabus" className={LINK}>
                Syllabus
              </Link>
              <Link href="/auth/signin" className={LINK}>
                Sign in to your account
              </Link>
              <Link href="/auth/signup" className={LINK}>
                Create account
              </Link>
            </>
          )}
          <Link href="/about" className={LINK}>
            About
          </Link>
          <Link href="/contact" className={LINK}>
            Contact
          </Link>
          <Link href="/privacy" className={LINK}>
            Privacy
          </Link>
          {PROFILE_LINKS.map((p) => (
            <a key={p.href} href={p.href} rel="me noopener" className={LINK}>
              {p.label}
            </a>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} pylearn</p>
      </div>
    </footer>
  );
}
