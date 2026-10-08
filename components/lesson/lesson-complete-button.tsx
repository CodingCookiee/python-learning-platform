"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigation-progress";
import { CheckCircle2, Circle, LoaderCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AchievementNotificationQueue } from "@/components/gamification";
import { WhiteBeltCeremony } from "@/components/onramp/white-belt-ceremony";
import type { UnlockedAchievement } from "@/lib/achievements";
import { PendingLine } from "@/components/ui/pending-line";

/** Finishing the Start on-ramp's last lesson earns this, and plays the white belt ceremony */
const WHITE_BELT_TIED = "white-belt-tied";

export interface LessonCompleteButtonProps {
  lessonId: string;
  nextLessonId?: string | null;
  /** Where the last lesson sends the learner: the module page, where its checkpoint opens */
  moduleId?: string;
  initialCompleted?: boolean;
  isLocked?: boolean;
  lockedMessage?: string;
  /** On-ramp lessons only: module 1's page, where the white belt ceremony sends the learner */
  afterOnRampHref?: string;
  /** On-ramp lessons only: how many lessons the on-ramp has, for the ceremony's belt */
  onRampLessons?: number;
  className?: string;
}

type Status = "idle" | "loading" | "success" | "error";

export function LessonCompleteButton({
  lessonId,
  nextLessonId,
  moduleId,
  initialCompleted = false,
  isLocked = false,
  lockedMessage,
  afterOnRampHref,
  onRampLessons = 6,
  className,
}: LessonCompleteButtonProps) {
  const [ceremony, setCeremony] = React.useState<UnlockedAchievement | null>(null);
  const router = useRouter();
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [status, setStatus] = React.useState<Status>("idle");
  const [xpGained, setXpGained] = React.useState(0);
  const [achievements, setAchievements] = React.useState<UnlockedAchievement[]>([]);
  const [showXp, setShowXp] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  // Where the learner goes next once it's saved (and anything it unlocked has been seen)
  const [moveTo, setMoveTo] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!moveTo || achievements.length > 0) return;
    const timer = window.setTimeout(() => {
      startNavigation();
      router.push(moveTo);
    }, nextLessonId ? 1200 : 1800);
    return () => window.clearTimeout(timer);
  }, [moveTo, achievements.length, nextLessonId, router]);

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

      const tied = nowCompleted && afterOnRampHref ? data.achievements.find((a) => a.slug === WHITE_BELT_TIED) : undefined;
      if (tied) {
        // The ceremony is the celebration, so it doesn't queue as a toast as well
        setCeremony(tied);
        setAchievements(data.achievements.filter((a) => a.slug !== WHITE_BELT_TIED));
      } else if (nowCompleted && data.achievements.length > 0) {
        setAchievements(data.achievements);
      }

      // Refresh server component data
      router.refresh();

      // Move on to the next lesson, or the module's checkpoint (not when the ceremony is on screen:
      // the learner moves on from there); the success line stays until the page changes
      const next = !tied && nowCompleted ? (nextLessonId ? `/lessons/${nextLessonId}` : moduleId ? `/modules/${moduleId}#checkpoint-heading` : null) : null;
      if (next) setMoveTo(next);
      else setTimeout(() => setStatus("idle"), 1000);
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
      <AchievementNotificationQueue achievements={achievements} onDone={() => setAchievements([])} />
      {ceremony && afterOnRampHref && (
        <WhiteBeltCeremony
          open
          onOpenChange={(open) => {
            if (!open) setCeremony(null);
          }}
          xp={ceremony.xpReward}
          lessons={onRampLessons}
          nextHref={afterOnRampHref}
        />
      )}

      <div className={cn("flex flex-col gap-3", className)}>
        <div className="relative">
          <Button
            onClick={() => {
              if (!isLoading) void handleToggle();
            }}
            aria-busy={isLoading || undefined}
            aria-disabled={isLoading || undefined}
            disabled={isLocked || isReadOnly}
            variant={completed ? "outline" : "default"}
            size="lg"
            className={cn(
              "w-full sm:w-auto",
              isLoading && "cursor-progress",
              completed && "border-success/40 text-success disabled:opacity-100"
            )}
          >
            {isLoading ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
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

        {isLoading && <PendingLine delayMs={600} lines={["Saving your progress…", "Adding your XP…"]} still="Still saving: the server is taking a moment." />}
        {moveTo && (
          <PendingLine
            lines={[nextLessonId ? "Taking you to the next lesson…" : "Taking you to the module's checkpoint…"]}
            still="Still loading the page…"
          />
        )}

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
                : "Lesson complete. That was the last lesson in this module; its checkpoint is open."}
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
