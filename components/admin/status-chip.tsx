import { cn } from "@/lib/utils";

/** A small status label on admin rows: admin, a warning (suspended, revoked), or a quiet note */
export function StatusChip({
  tone,
  children,
}: {
  tone: "admin" | "warn" | "muted";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-sm px-1.5 py-px text-xs font-semibold whitespace-nowrap",
        tone === "admin" && "bg-primary/12 text-primary",
        tone === "warn" && "bg-destructive/10 text-destructive",
        tone === "muted" && "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}
