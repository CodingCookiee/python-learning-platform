import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
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
        </nav>
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} pylearn</p>
      </div>
    </footer>
  );
}
