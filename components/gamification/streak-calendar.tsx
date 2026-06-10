"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface StreakCalendarProps {
  /** Array of ISO date strings (YYYY-MM-DD) on which the user was active */
  activeDates: string[];
  className?: string;
}

const DAY_LABELS = ["M", "", "W", "", "F", "", ""];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build the grid of days.
 * Returns an array of `numWeeks` columns, each containing 7 day cells (Mon=0 ... Sun=6).
 * Cells before today and after the start of the range are filled; the rest are null (padding).
 */
function buildGrid(numWeeks: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Align to the most recent Sunday so columns are full weeks
  const dayOfWeek = today.getDay(); // 0=Sun
  // We want Mon-Sun weeks. Offset today to the nearest upcoming Sunday.
  const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysToSunday);

  const totalDays = numWeeks * 7;
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - totalDays + 1);

  // Build flat array [startDate ... endDate]
  const days: Array<{ dateStr: string; month: number; weekIndex: number; dayIndex: number }> = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const weekIndex = Math.floor(i / 7);
    const dayIndex = i % 7; // 0=Mon ... 6=Sun
    days.push({
      dateStr: toLocalDateString(d),
      month: d.getMonth(),
      weekIndex,
      dayIndex,
    });
  }

  // Build columns (weeks)
  const columns: Array<{
    weekIndex: number;
    month: number;
    days: typeof days;
  }> = [];
  for (let w = 0; w < numWeeks; w++) {
    const weekDays = days.filter((d) => d.weekIndex === w);
    const midDay = weekDays[3] ?? weekDays[0];
    columns.push({ weekIndex: w, month: midDay?.month ?? 0, days: weekDays });
  }

  return columns;
}

/** Determines whether to show the month label for a column */
function getMonthLabel(columns: ReturnType<typeof buildGrid>, colIndex: number): string | null {
  if (colIndex === 0) return MONTH_NAMES[columns[0].month];
  const prev = columns[colIndex - 1];
  const cur = columns[colIndex];
  if (prev && cur && prev.month !== cur.month) {
    return MONTH_NAMES[cur.month];
  }
  return null;
}

export function StreakCalendar({ activeDates, className }: StreakCalendarProps) {
  const activeSet = React.useMemo(() => new Set(activeDates), [activeDates]);

  // Responsive: 12 weeks on md+, 8 weeks on mobile
  const [numWeeks, setNumWeeks] = React.useState(12);
  React.useEffect(() => {
    function update() {
      setNumWeeks(window.innerWidth < 768 ? 8 : 12);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const columns = React.useMemo(() => buildGrid(numWeeks), [numWeeks]);

  const CELL = "size-3 rounded-sm";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn("flex flex-col gap-1 overflow-x-auto", className)}
      role="img"
      aria-label="Activity calendar showing the last several weeks"
    >
      {/* Month labels */}
      <div className="flex gap-1 pl-6">
        {columns.map((col, ci) => {
          const label = getMonthLabel(columns, ci);
          return (
            <div key={col.weekIndex} className="w-3 shrink-0">
              {label ? (
                <span className="text-[0.55rem] font-medium leading-none text-muted-foreground whitespace-nowrap">
                  {label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Day rows */}
      <div className="flex gap-1">
        {/* Day-of-week labels column */}
        <div className="flex flex-col gap-1 pr-1 w-5 shrink-0">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-3 flex items-center justify-end">
              {label ? (
                <span className="text-[0.55rem] font-medium text-muted-foreground">{label}</span>
              ) : null}
            </div>
          ))}
        </div>

        {/* Activity grid */}
        {columns.map((col) => (
          <div key={col.weekIndex} className="flex flex-col gap-1">
            {col.days.map((cell) => {
              const isActive = activeSet.has(cell.dateStr);
              return (
                <div
                  key={cell.dateStr}
                  title={cell.dateStr}
                  className={cn(CELL, isActive ? "bg-emerald-500 dark:bg-emerald-400" : "bg-muted")}
                  aria-label={`${cell.dateStr}${isActive ? " — active" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
