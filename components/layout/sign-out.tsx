"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { startNavigation } from "@/components/layout/navigation-progress";

/** The sign-out button inside its form: "Signing out…" until the home page takes over */
function Submit({ asButton = false }: { asButton?: boolean }) {
  const { pending } = useFormStatus();
  const spinner = pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null;
  const label = pending ? "Signing out…" : "Sign out";
  if (asButton) {
    return (
      <Button variant="ghost" size="sm" type="submit" aria-busy={pending || undefined} onClick={() => startNavigation()}>
        {spinner}
        {label}
      </Button>
    );
  }
  return (
    <button type="submit" aria-busy={pending || undefined} onClick={() => startNavigation()} className="flex w-full items-center gap-2 text-left">
      {spinner}
      {label}
    </button>
  );
}

/** Sign out in the account menu, which stays open to show it's signing out */
export function SignOutMenuItem({ action }: { action: () => Promise<void> }) {
  return (
    <DropdownMenuItem asChild onSelect={(event) => event.preventDefault()}>
      <form action={action} className="w-full">
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
