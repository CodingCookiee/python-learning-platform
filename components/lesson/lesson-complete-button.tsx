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
  isLocked?: boolean;
  lockedMessage?: string;
  className?: string;
}

type Status = "idle" | "loading" | "success" | "error";

export function LessonCompleteButton({
  lessonId,
  nextLessonId,
  initialCompleted = false,
  isLocked = false,
  lockedMessage,
  className,
}: LessonCompleteButtonProps) {
  const router = useRouter();
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [status, setStatus] = React.useState<Status>("idle");
  const [xpGained, setXpGained] = React.useState(0);
  const [achievements, setAchievements] = React.useState<UnlockedAchievement[]>([]);
  const [showXp, setShowXp] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleToggle() {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/progress/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: !completed }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        const message =
          payload?.error ??
          (res.status === 403
            ? "This lesson is locked until the prerequisite module is complete."
            : "Something went wrong. Please try again.");
        setErrorMessage(message);
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
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isReadOnly = completed;
  const lockedCopy =
    lockedMessage ?? "Complete the prerequisite module before you can mark this lesson complete.";

  return (
    <>
      <AchievementNotificationQueue achievements={achievements} />

      <div className={cn("flex flex-col gap-3", className)}>
        <div className="relative">
          <Button
            onClick={handleToggle}
            disabled={isLoading || isLocked || isReadOnly}
            variant={completed ? "outline" : "default"}
            size="lg"
            className={cn(
              "w-full sm:w-auto",
              completed && "border-success/40 text-success disabled:opacity-100"
            )}
            aria-label={
              isLocked
                ? "Lesson locked"
                : completed
                  ? "Lesson completed and available for review"
                  : "Mark lesson as complete"
            }
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : completed ? (
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
            ) : (
              <Circle className="size-4" aria-hidden="true" />
            )}
            {isLoading
              ? "Saving…"
              : completed
                ? "Lesson complete"
                : isLocked
                  ? "Finish earlier lessons first"
                  : "Mark lesson complete"}
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
                className="font-condensed tabular pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-sm bg-highlight px-1.5 text-sm font-bold whitespace-nowrap text-highlight-foreground"
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
              className="text-sm text-success"
            >
              {nextLessonId
                ? "Lesson complete. You can come back to it any time."
                : "Lesson complete. That was the last lesson in this module."}
            </motion.p>
          )}
          {status === "error" && (
            <motion.p
              key="error-msg"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-destructive"
            >
              {isLocked ? lockedCopy : (errorMessage ?? "That didn't save. Check your connection and try again.")}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
