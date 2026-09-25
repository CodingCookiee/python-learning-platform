import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full resize-y rounded-sm border border-input bg-sheet px-3 py-2.5 text-base leading-relaxed transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground hover:border-foreground/35 focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring),transparent_75%)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
