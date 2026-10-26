import { SignOutMenuItem, SigningOutNotice } from "@/components/layout/sign-out";
import { recordSeen } from "@/lib/last-seen";
import { BeltTheme } from "@/components/brand/belt-theme";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { initialsFor } from "@/lib/utils";
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
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sessionIsCurrent } from "@/lib/session-version";
import { unreadCount } from "@/lib/admin/notifications";
import { AdminBell } from "@/components/admin/admin-bell";
import { getLearnerRank } from "@/lib/learner-rank";
import { SearchBar } from "@/components/layout/search-bar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavLinks } from "@/components/layout/nav-links";

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  // Lessons, drills, checkpoints and capstones are all part of the syllabus
  {
    href: "/modules",
    label: "Syllabus",
    also: ["/lessons", "/exercises", "/checkpoints", "/projects"],
  },
  { href: "/review", label: "Review" },
  { href: "/log", label: "Log" },
  { href: "/achievements", label: "Achievements" },
];

export async function Navbar() {
  const session = await auth();
  const user = session?.user ?? null;
  const userId = user?.id;

  const [account, rank] = userId
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, suspendedAt: true, lastSeenAt: true, sessionVersion: true },
        }),
        getLearnerRank(userId),
      ])
    : [null, null];
  // Suspended by an admin: end the session and say why (the API refuses them already)
  if (account?.suspendedAt) redirect("/auth/session-ended?reason=suspended");
  // Signed in before the password last changed, on this device or another (lib/session-version.ts)
  if (account && !sessionIsCurrent(user?.sessionVersion, account.sessionVersion)) {
    redirect("/auth/session-ended?reason=password");
  }
  // "Last seen" for the admin overview: any signed-in page counts, written at most every few minutes
  if (userId && account) recordSeen(userId, account.lastSeenAt);
  const userIsAdmin = account?.role === "ADMIN" || account?.role === "SUPER_ADMIN";
  const unread = userIsAdmin && userId ? await unreadCount(userId) : 0;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const initials = initialsFor(user?.name, user?.email);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      {user && <SigningOutNotice />}
      {/* The loader everywhere is tied in this learner's belt */}
      {rank && <BeltTheme belt={rank.belt} />}
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-gutter">
        <div className="flex items-center gap-8">
          <Link
            href={user ? "/dashboard" : "/"}
            className="rounded-sm"
            aria-label={rank ? `pylearn home, ${rank.label} ${rank.beltLabel}` : "pylearn home"}
          >
            <Logo belt={rank?.belt ?? "accent"} />
          </Link>

          {user && (
            <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
              <NavLinks links={APP_LINKS} />
            </nav>
          )}
        </div>

        <SearchBar />

        <div className="flex items-center gap-2">
          {/* Admins only: new sign-ups and capstones, on every screen size */}
          {userIsAdmin && <AdminBell initialUnread={unread} />}
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* The spoken name starts with the visible rank, so voice control users can say what they see */}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={rank ? `${rank.label}, account menu` : "Account menu"}
                    className="gap-2 pl-1.5"
                  >
                    <span
                      className="flex size-6 items-center justify-center rounded-sm bg-accent text-xs font-bold"
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                    {rank && (
                      <span className="font-condensed tabular text-sm font-semibold">
                        {rank.label}
                      </span>
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
                  <SignOutMenuItem action={handleSignOut} />
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/signin">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/signup">Start free</Link>
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
      </div>
    </header>
  );
}
