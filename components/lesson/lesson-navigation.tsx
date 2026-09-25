import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LessonNavigationProps {
  previous: { id: string; title: string; order: number } | null;
  next: { id: string; title: string; order: number } | null;
  className?: string;
}

export function LessonNavigation({ previous, next, className }: LessonNavigationProps) {
  return (
    <nav aria-label="Previous and next lesson" className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {previous ? (
        <Link
          href={`/lessons/${previous.id}`}
          className="flex items-center gap-3 rounded-md border border-border p-4 hover:bg-accent/50"
        >
          <ArrowLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-muted-foreground">Previous lesson</span>
            <span className="truncate font-semibold">{previous.title}</span>
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next && (
        <Link
          href={`/lessons/${next.id}`}
          className="flex items-center justify-end gap-3 rounded-md border border-border p-4 text-right hover:bg-accent/50"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-muted-foreground">Next lesson</span>
            <span className="truncate font-semibold">{next.title}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}
