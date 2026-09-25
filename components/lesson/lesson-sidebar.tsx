"use client";

import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { LockedMark } from "@/components/brand/marks";

export interface LessonSidebarProps {
  currentLessonId: string;
  moduleId: string;
  moduleTitle: string;
  lessons: Array<{
    id: string;
    title: string;
    order: number;
    completed: boolean;
    estimatedTime: number;
    isUnlocked?: boolean;
  }>;
  className?: string;
}

/** The module's lessons in order, with the current one marked */
export function LessonSidebar({
  currentLessonId,
  moduleId,
  moduleTitle,
  lessons,
  className,
}: LessonSidebarProps) {
  const completedCount = lessons.filter((l) => l.completed).length;
  const total = lessons.length;
  const pct = total > 0 ? (completedCount / total) * 100 : 0;

  return (
    <nav aria-label="Lessons in this module" className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-3">
        <Link
          href={`/modules/${moduleId}`}
          className="flex items-center gap-1 text-sm font-semibold hover:text-primary"
        >
          <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{moduleTitle}</span>
        </Link>
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-[2px] bg-muted" aria-hidden="true">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="font-condensed tabular text-sm text-muted-foreground">
            {completedCount} of {total} lessons done
          </p>
        </div>
      </div>

      <ol className="flex flex-col gap-0.5">
        {lessons.map((lesson) => {
          const isCurrent = lesson.id === currentLessonId;
          const isUnlocked = lesson.isUnlocked ?? true;

          const row = (
            <div
              className={cn(
                "grid grid-cols-[1.75rem_minmax(0,1fr)_1rem] items-start gap-2 rounded-sm px-2 py-2",
                isCurrent ? "bg-accent" : isUnlocked && "hover:bg-accent/50"
              )}
            >
              <span className="font-condensed tabular pt-px text-sm font-bold text-muted-foreground">
                {String(lesson.order).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={cn(
                    "text-sm leading-snug",
                    isCurrent ? "font-semibold text-foreground" : "text-foreground/85",
                    !isUnlocked && "text-muted-foreground"
                  )}
                >
                  {lesson.title}
                </span>
                <span className="font-condensed tabular text-xs text-muted-foreground">
                  {lesson.estimatedTime} min
                </span>
              </span>
              <span className="pt-0.5">
                {lesson.completed ? (
                  <Check className="size-4 text-success" aria-label="Finished" />
                ) : !isUnlocked ? (
                  <LockedMark className="size-4 text-muted-foreground" title="Locked" />
                ) : null}
              </span>
            </div>
          );

          if (isCurrent || !isUnlocked) {
            return (
              <li key={lesson.id} aria-current={isCurrent ? "page" : undefined}>
                {row}
              </li>
            );
          }
          return (
            <li key={lesson.id}>
              <Link href={`/lessons/${lesson.id}`} className="block rounded-sm">
                {row}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
