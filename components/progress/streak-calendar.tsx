"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StreakCalendarProps {
  activeDates: Date[];
  className?: string;
}

function generateDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

export function StreakCalendar({ activeDates, className }: StreakCalendarProps) {
  const days = generateDays(49);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeSet = new Set(activeDates.map((d) => new Date(d).toDateString()));

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col gap-2", className)} aria-label="Activity calendar">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => {
                const isActive = activeSet.has(day.toDateString());
                const isToday = day.toDateString() === today.toDateString();
                const label = day.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <Tooltip key={di}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "size-3 sm:size-3 cursor-default transition-colors",
                          isActive ? "bg-primary" : "bg-muted",
                          isToday && "ring-1 ring-primary ring-offset-1 ring-offset-background"
                        )}
                        aria-label={`${label}${isActive ? " — active" : ""}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <span>{label}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-[0.6rem] tracking-widest uppercase text-muted-foreground">
            Less
          </span>
          <div className="flex gap-0.5">
            {[0.15, 0.35, 0.6, 0.8, 1].map((opacity, i) => (
              <div key={i} className="size-2.5 bg-primary" style={{ opacity }} aria-hidden="true" />
            ))}
          </div>
          <span className="font-heading text-[0.6rem] tracking-widest uppercase text-muted-foreground">
            More
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
