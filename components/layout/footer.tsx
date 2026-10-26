import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PROFILE_LINKS } from "@/lib/landing/structured-data";

export function Footer() {
  return (
    // Room underneath for the Sensei's button, which sits in the corner over the page's end
    <footer className="border-t border-border pb-16">
      <div className="mx-auto flex max-w-page flex-col gap-4 px-gutter py-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo markClassName="size-6" className="text-muted-foreground" />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/modules" className="text-muted-foreground hover:text-foreground">
            Syllabus
          </Link>
          <Link href="/achievements" className="text-muted-foreground hover:text-foreground">
            Achievements
          </Link>
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">
            Settings
          </Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground">
            About
          </Link>
          <Link href="/contact" className="text-muted-foreground hover:text-foreground">
            Contact
          </Link>
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
          {PROFILE_LINKS.map((p) => (
            <a key={p.href} href={p.href} rel="me noopener" className="text-muted-foreground hover:text-foreground">
              {p.label}
            </a>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} pylearn</p>
      </div>
    </footer>
  );
}
