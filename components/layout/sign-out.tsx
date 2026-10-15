"use client";

import { Spinner } from "@/components/brand/knot-loader";
import * as React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { startNavigation } from "@/components/layout/navigation-progress";
import { forgetAccountStorage } from "@/lib/account-storage";

/**
 * Signing out, kept outside the menu: the account menu can be closed while the sign-out is on its
 * way, and reopening it must still say "Signing out…" rather than offer it again. The page also
 * says so on its own until the home page takes over.
 */
let signingOut = false;
const listeners = new Set<() => void>();
function setSigningOut(next: boolean) {
  signingOut = next;
  listeners.forEach((l) => l());
}
function useSigningOut(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => signingOut,
    () => false
  );
}

/**
 * The sign-in and sign-up pages clear it as they open: the tab can stay loaded from signing out to
 * signing back in, and the flag would otherwise still say "Signing out…" in the new session.
 */
export function ResetSigningOut() {
  React.useEffect(() => {
    if (signingOut) setSigningOut(false);
  }, []);
  return null;
}

function begin(event: React.MouseEvent) {
  // A second press while it's going does nothing
  if (signingOut) {
    event.preventDefault();
    return;
  }
  setSigningOut(true);
  // This account's drafts and Sensei chat don't stay behind for whoever uses the browser next
  forgetAccountStorage();
  startNavigation();
}

/** The sign-out button inside its form */
function Submit({ asButton = false }: { asButton?: boolean }) {
  const pending = useSigningOut();
  const spinner = pending ? <Spinner className="size-4" /> : null;
  const label = pending ? "Signing out…" : "Sign out";
  if (asButton) {
    return (
      <Button
        variant="ghost"
        size="sm"
        type="submit"
        aria-busy={pending || undefined}
        aria-disabled={pending || undefined}
        onClick={begin}
      >
        {spinner}
        {label}
      </Button>
    );
  }
  return (
    <button
      type="submit"
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={begin}
      className="flex w-full items-center gap-2 text-left aria-disabled:cursor-progress"
    >
      {spinner}
      {label}
    </button>
  );
}

/** Sign out in the account menu, which stays open to show it's signing out */
export function SignOutMenuItem({ action }: { action: () => Promise<void> }) {
  return (
    <DropdownMenuItem asChild onSelect={(event) => event.preventDefault()}>
      <form
        action={async () => {
          try {
            await action();
          } catch (error) {
            // A redirect is how a sign-out ends; anything else means it didn't happen
            if (!(error instanceof Error) || !error.message.includes("NEXT_REDIRECT"))
              setSigningOut(false);
            throw error;
          }
        }}
        className="w-full"
      >
        <Submit />
      </form>
    </DropdownMenuItem>
  );
}

/** Sign out as a button (the mobile menu) */
export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Submit asButton />
    </form>
  );
}

/**
 * While a sign-out is going, a notice stays on the page whatever the menus do. Rendered once, in the
 * app's header.
 */
export function SigningOutNotice() {
  const pending = useSigningOut();
  if (!pending || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="status"
      className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-2 rounded-sm border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-overlay"
    >
      <Spinner className="size-4 text-primary" />
      Signing you out…
    </div>,
    document.body
  );
}
