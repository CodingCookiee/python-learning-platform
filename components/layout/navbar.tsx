import Link from "next/link";
import { Terminal } from "lucide-react";
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
import { isAdmin } from "@/lib/api-auth";
import { SearchBar } from "@/components/layout/search-bar";
import { MobileMenu } from "@/components/layout/mobile-menu";

export async function Navbar() {
  const session = await auth();
  const user = session?.user ?? null;
  let userIsAdmin = false;
  if (user?.email) {
    const { prisma } = await import("@/lib/prisma");
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    if (dbUser) userIsAdmin = await isAdmin(dbUser.id);
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" aria-label="PyLearn home">
          <Terminal className="size-5 text-primary" aria-hidden="true" />
          <span className="font-heading text-sm font-semibold tracking-widest uppercase">
            PyLearn
          </span>
        </Link>

        {/* Search bar */}
        <SearchBar />

        {/* Desktop nav links */}
        <nav
          className="hidden items-center gap-6 text-xs font-semibold tracking-widest uppercase text-muted-foreground md:flex"
          aria-label="Main navigation"
        >
          <Link href="/#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/#curriculum" className="transition-colors hover:text-foreground">
            Curriculum
          </Link>
          <Link href="/modules" className="transition-colors hover:text-foreground">
            Modules
          </Link>
        </nav>

        {/* Desktop auth controls */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="User account menu">
                    <div
                      className="flex size-5 shrink-0 items-center justify-center bg-primary text-[0.5rem] font-semibold tracking-widest text-primary-foreground"
                      aria-hidden="true"
                    >
                      {(user.name ?? user.email ?? "U").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="max-w-[120px] truncate text-xs font-semibold tracking-widest uppercase">
                      {user.name ?? user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-semibold">{user.name}</p>
                    {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/modules">Modules</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/achievements">Achievements</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  {userIsAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Admin Dashboard</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action={handleSignOut} className="w-full">
                      <button type="submit" className="w-full text-left">
                        Sign Out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu (client component) */}
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
