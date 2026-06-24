"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ChevronLeft, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedProgressBar } from "@/components/progress";

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

export function LessonSidebar({
  currentLessonId,
  moduleId,
  moduleTitle,
  lessons,
  className,
}: LessonSidebarProps) {
  const completedCount = lessons.filter((l) => l.completed).length;
  const total = lessons.length;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <nav aria-label="Lesson navigation" className={cn("flex flex-col gap-4", className)}>
      {/* Module heading link */}
      <Link
        href={`/modules/${moduleId}`}
        className="flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{moduleTitle}</span>
      </Link>

      {/* Section label */}
      <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
        In this module
      </p>

      {/* Lesson list */}
      <ol className="flex flex-col gap-0">
        {lessons.map((lesson) => {
          const isCurrent = lesson.id === currentLessonId;
          const isUnlocked = lesson.isUnlocked ?? true;

          const rowContent = (
            <div
              className={cn(
                "flex items-start gap-2.5 py-2 pl-3 border-l-2 transition-colors",
                isCurrent ? "border-primary" : "border-transparent hover:text-foreground"
              )}
            >
              {lesson.completed ? (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
              ) : !isUnlocked ? (
                <Lock className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
              ) : (
                <Circle
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    "text-sm leading-snug",
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                    !isUnlocked && "text-muted-foreground"
                  )}
                >
                  {lesson.title}
                </span>
                {!isUnlocked && (
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-amber-600 dark:text-amber-400">
                    Locked
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{lesson.estimatedTime}min</span>
              </div>
            </div>
          );

          if (isCurrent || !isUnlocked) {
            return (
              <li key={lesson.id} aria-current="page">
                {rowContent}
              </li>
            );
          }

          return (
            <li key={lesson.id}>
              <Link
                href={`/lessons/${lesson.id}`}
                className="block transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {rowContent}
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Progress summary */}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{completedCount}</span>
          <span>/{total} complete</span>
        </p>
        <AnimatedProgressBar value={progressPercent} />
      </div>
    </nav>
  );
}
