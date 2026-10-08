"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A button whose action takes time. While `loading` it swaps its icon for a spinner and its label for
 * `loadingText`, keeping one width and full opacity (DESIGN.md: async buttons swap only icon and
 * label), says it's busy to assistive tech, and ignores repeat clicks. If the action navigates, keep
 * `loading` true until the next page replaces this one rather than clearing it in `finally`.
 */
export function LoadingButton({
  loading = false,
  loadingText,
  icon,
  children,
  onClick,
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & {
  loading?: boolean;
  /** The verb while working ("Saving…"); the label stays when it's left out */
  loadingText?: React.ReactNode;
  /** The icon at rest; the spinner takes its place while loading */
  icon?: React.ReactNode;
}) {
  return (
    <Button
      {...props}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cn(loading && "cursor-progress", className)}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : icon}
      {/* Both labels share one cell, as wide as the longer (no jump): beside an icon they start right
          after it; on their own they sit centred, so the spare width reads as even padding */}
      <span className={cn("grid", icon ? "justify-items-start text-left" : "justify-items-center")}>
        <span className={cn("col-start-1 row-start-1", loading && loadingText !== undefined && "invisible")}>{children}</span>
        {loadingText !== undefined && (
          <span className={cn("col-start-1 row-start-1", !loading && "invisible")}>{loadingText}</span>
        )}
      </span>
    </Button>
  );
}
