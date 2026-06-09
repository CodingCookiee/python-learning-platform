"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface LessonNavigationProps {
  previous: { id: string; title: string; order: number } | null;
  next: { id: string; title: string; order: number } | null;
  className?: string;
}

export function LessonNavigation({ previous, next, className }: LessonNavigationProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-t border-border pt-6",
        className
      )}
    >
      {/* Previous */}
      {previous ? (
        <Button variant="outline" asChild>
          <Link href={`/lessons/${previous.id}`} className="flex items-center gap-1.5">
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            <div className="flex flex-col items-start text-left">
              <span className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Previous
              </span>
              <span
                className="max-w-[200px] truncate text-xs font-normal normal-case tracking-normal"
                title={previous.title}
              >
                {previous.title}
              </span>
            </div>
          </Link>
        </Button>
      ) : (
        <div />
      )}

      {/* Next */}
      {next ? (
        <Button asChild>
          <Link href={`/lessons/${next.id}`} className="flex items-center gap-1.5">
            <div className="flex flex-col items-end text-right">
              <span className="font-heading text-xs font-semibold tracking-widest uppercase">
                Next
              </span>
              <span
                className="max-w-[200px] truncate text-xs font-normal normal-case tracking-normal"
                title={next.title}
              >
                {next.title}
              </span>
            </div>
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
}
