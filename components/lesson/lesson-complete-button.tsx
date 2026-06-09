"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AchievementNotificationQueue } from "@/components/gamification";
import type { UnlockedAchievement } from "@/lib/achievements";

export interface LessonCompleteButtonProps {
  lessonId: string;
  nextLessonId?: string | null;
  initialCompleted?: boolean;
  className?: string;
}

type Status = "idle" | "loading" | "success" | "error";

export function LessonCompleteButton({
  lessonId,
  nextLessonId,
  initialCompleted = false,
  className,
}: LessonCompleteButtonProps) {
  const router = useRouter();
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [status, setStatus] = React.useState<Status>("idle");
  const [xpGained, setXpGained] = React.useState(0);
  const [achievements, setAchievements] = React.useState<UnlockedAchievement[]>([]);
  const [showXp, setShowXp] = React.useState(false);

  async function handleToggle() {
    setStatus("loading");
    try {
      const res = await fetch("/api/progress/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: !completed }),
      });

      if (!res.ok) {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      const data = (await res.json()) as {
        success: boolean;
        xpGained: number;
        achievements: UnlockedAchievement[];
      };

      const nowCompleted = !completed;
      setCompleted(nowCompleted);
      setStatus("success");

      if (nowCompleted && data.xpGained > 0) {
        setXpGained(data.xpGained);
        setShowXp(true);
        setTimeout(() => setShowXp(false), 2500);
      }

      if (nowCompleted && data.achievements.length > 0) {
        setAchievements(data.achievements);
      }

      // Refresh server component data
      router.refresh();

      // Auto-navigate to next lesson after a short delay
      if (nowCompleted && nextLessonId) {
        setTimeout(() => {
          router.push(`/lessons/${nextLessonId}`);
        }, 1200);
      }

      setTimeout(() => setStatus("idle"), 1000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  return (
    <>
      <AchievementNotificationQueue achievements={achievements} />

      <div className={cn("flex flex-col gap-3", className)}>
        <div className="relative">
          <Button
            onClick={handleToggle}
            disabled={isLoading}
            variant={completed ? "outline" : "default"}
            className={cn(
              "w-full sm:w-auto transition-all",
              completed &&
                "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5"
            )}
            aria-label={completed ? "Mark lesson as incomplete" : "Mark lesson as complete"}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : completed ? (
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
            ) : (
              <Circle className="size-4" aria-hidden="true" />
            )}
            {isLoading ? "Saving..." : completed ? "Completed" : "Mark as Complete"}
          </Button>

          {/* XP gained float */}
          <AnimatePresence>
            {showXp && (
              <motion.span
                key="xp-float"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -28 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: "easeOut" }}
                className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 font-heading text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap"
                aria-hidden="true"
              >
                +{xpGained} XP
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Status messages */}
        <AnimatePresence>
          {isSuccess && completed && (
            <motion.p
              key="complete-msg"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-emerald-600 dark:text-emerald-400"
            >
              {nextLessonId
                ? "Nice work! Moving to the next lesson…"
                : "Lesson complete! Great job 🎉"}
            </motion.p>
          )}
          {status === "error" && (
            <motion.p
              key="error-msg"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-destructive"
            >
              Something went wrong. Please try again.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
