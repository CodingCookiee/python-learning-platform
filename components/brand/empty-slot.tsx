import { cn } from "@/lib/utils";
import { LockedMark } from "@/components/brand/marks";

export function EmptySlot({
  mark = <LockedMark />,
  title,
  children,
  action,
  center = false,
  className,
}: {
  /** One of the brand marks (components/brand/marks.tsx); sized here */
  mark?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  /** Centred and taller, for a page's main list (a queue) rather than one section of a page */
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 rounded-md border border-dashed border-(--keyline)/45 p-5",
        center ? "flex-col items-center py-12 text-center" : "items-start",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-sm border border-dashed border-(--keyline)/60 text-muted-foreground [&_svg]:size-5"
      >
        {mark}
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1",
          center ? "items-center" : "items-start",
          !title && "self-center"
        )}
      >
        {title && <p className="font-semibold">{title}</p>}
        {children && (
          <div className="max-w-[65ch] text-sm leading-relaxed text-pretty text-muted-foreground">
            {children}
          </div>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
