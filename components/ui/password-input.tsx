"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A password field with a Show / Hide switch on its right edge, so a learner can check what they
 * typed (on a phone especially) instead of being made to type it twice blind. The switch is plain
 * words in the condensed face, not an eye icon.
 */
export function PasswordInput({
  className,
  what = "password",
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  /** Which password, for the switch's name when a form has two ("new password", "confirmation") */
  what?: string;
}) {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className={cn("pr-16", className)} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        aria-controls={props.id}
        aria-label={`${shown ? "Hide" : "Show"} ${what}`}
        disabled={props.disabled}
        className="font-condensed absolute inset-y-1 right-1 rounded-sm px-2.5 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
