"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  Trophy,
  User,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface MobileMenuProps {
  isAuthenticated: boolean;
  userName?: string | null;
  userEmail?: string | null;
  isAdmin?: boolean;
  onSignOut: () => Promise<void>;
}

const publicLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#curriculum", label: "Curriculum" },
  { href: "/modules", label: "Modules" },
];

const authLinks = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/modules", label: "Modules", Icon: BookOpen },
  { href: "/achievements", label: "Achievements", Icon: Trophy },
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function MobileMenu({
  isAuthenticated,
  userName,
  userEmail,
  isAdmin = false,
  onSignOut,
}: MobileMenuProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close on navigation ? use ref to avoid calling setState synchronously in effect body
  const prevPathRef = React.useRef(pathname);
  React.useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      // Schedule the state update outside the synchronous effect body
      const t = setTimeout(() => setOpen(false), 0);
      return () => clearTimeout(t);
    }
  });

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const initials = (userName ?? userEmail ?? "U").slice(0, 2).toUpperCase();

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
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="size-5" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="size-5" aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            key="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-x-0 top-full z-50 border-b border-border/60 bg-background/95 backdrop-blur-md shadow-lg"
            role="dialog"
            aria-label="Mobile navigation"
          >
            <nav
              className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6 lg:px-8"
              aria-label="Mobile main navigation"
            >
              {isAuthenticated ? (
                <>
                  {/* User info */}
                  <div className="flex items-center gap-3 px-3 py-2 mb-1">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground"
                      aria-hidden="true"
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{userName ?? "Account"}</p>
                      {userEmail && (
                        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-border mb-1" />

                  {[
                    ...authLinks,
                    ...(isAdmin ? [{ href: "/admin", label: "Admin", Icon: ShieldCheck }] : []),
                  ].map(({ href, label, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors min-h-[44px] ${
                        pathname === href
                          ? "bg-primary/5 text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {label}
                    </Link>
                  ))}

                  <div className="h-px bg-border my-1" />

                  <div className="flex items-center justify-between px-3 py-2">
                    <ThemeToggle />
                    <form action={onSignOut}>
                      <Button variant="ghost" size="sm" type="submit">
                        Sign Out
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  {publicLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="px-3 py-2.5 text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground min-h-[44px] flex items-center"
                    >
                      {label}
                    </Link>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row">
                    <Button variant="ghost" size="sm" asChild className="justify-start">
                      <Link href="/auth/signin">Sign In</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/auth/signup">Get Started</Link>
                    </Button>
                  </div>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
