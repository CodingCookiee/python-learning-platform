import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { isAdmin } from "@/lib/api-auth";
import { getLearnerRank } from "@/lib/learner-rank";
import { SearchBar } from "@/components/layout/search-bar";
import { MobileMenu } from "@/components/layout/mobile-menu";

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/modules", label: "Syllabus" },
  { href: "/achievements", label: "Achievements" },
];

export async function Navbar() {
  const session = await auth();
  const user = session?.user ?? null;
  const userId = user?.id;

  const [userIsAdmin, rank] = userId
    ? await Promise.all([isAdmin(userId), getLearnerRank(userId)])
    : [false, null];

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const initials = (user?.name ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href={user ? "/dashboard" : "/"}
            className="rounded-sm"
            aria-label={rank ? `pylearn home, ${rank.label} ${rank.beltLabel}` : "pylearn home"}
          >
            <Logo belt={rank?.belt ?? "black"} />
          </Link>

          {user && (
            <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
              {APP_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <SearchBar />

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Account menu" className="gap-2 pl-1.5">
                  <span
                    className="flex size-6 items-center justify-center rounded-sm bg-accent text-[0.625rem] font-bold"
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  {rank && (
                    <span className="font-condensed tabular text-sm font-semibold">{rank.label}</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <div className="px-2 py-2">
                  <p className="text-sm font-semibold">{user.name}</p>
                  {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  {rank && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {rank.label} · {rank.beltLabel}
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                {userIsAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={handleSignOut} className="w-full">
                    <button type="submit" className="w-full text-left">
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/signup">Start at white belt</Link>
              </Button>
            </>
          )}
        </div>

        <MobileMenu
          isAuthenticated={!!user}
          userName={user?.name}
          userEmail={user?.email}
          isAdmin={userIsAdmin}
          onSignOut={handleSignOut}
        />
      </div>
    </header>
  );
}
