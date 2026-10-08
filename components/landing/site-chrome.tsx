import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="pylearn home" className="rounded-sm">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm md:flex">
          <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground">
            How it works
          </Link>
          <Link href="/#syllabus" className="text-muted-foreground hover:text-foreground">
            Syllabus
          </Link>
          <Link href="/#bridge" className="text-muted-foreground hover:text-foreground">
            For JS developers
          </Link>
          <Link href="/#faq" className="text-muted-foreground hover:text-foreground">
            Questions
          </Link>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/auth/signup">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Start free</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/#syllabus" className="text-muted-foreground hover:text-foreground">
            Syllabus
          </Link>
          <Link href="/auth/signin" className="text-muted-foreground hover:text-foreground">
            Sign in to your account
          </Link>
          <Link href="/auth/signup" className="text-muted-foreground hover:text-foreground">
            Create account
          </Link>
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
        </nav>
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} pylearn</p>
      </div>
    </footer>
  );
}
