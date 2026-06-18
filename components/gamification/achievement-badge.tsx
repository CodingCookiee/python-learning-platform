"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { renderAchievementIcon } from "@/lib/achievement-icon";

export interface AchievementBadgeProps {
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  category: string;
  xpReward: number;
  unlockedAt?: Date | string | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const tierStyles: Record<string, string> = {
  bronze: "border-amber-700/40 bg-amber-700/5",
  silver: "border-slate-400/40 bg-slate-400/5",
  gold: "border-yellow-500/40 bg-yellow-500/5",
  platinum: "border-violet-400/40 bg-violet-400/5",
};

const tierTextStyles: Record<string, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-400",
  gold: "text-yellow-500",
  platinum: "text-violet-400",
};

const sizeConfig = {
  sm: { container: "w-16 h-16", iconSize: 24 },
  md: { container: "w-24 h-24", iconSize: 40 },
  lg: { container: "w-32 h-32", iconSize: 48 },
};

function renderIconComponent(iconName: string, size: number, className: string) {
  return renderAchievementIcon({ iconName, size, className });
}

export function AchievementBadge({
  name,
  description,
  icon,
  tier,
  xpReward,
  unlockedAt = null,
  size = "md",
  showTooltip = true,
  className,
}: AchievementBadgeProps) {
  const isLocked = unlockedAt == null;
  const tierClass = tierStyles[tier] ?? "border-border bg-muted";
  const tierText = tierTextStyles[tier] ?? "text-muted-foreground";
  const sizes = sizeConfig[size];

  const badge = (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "relative flex flex-col items-center justify-between border p-1.5",
        sizes.container,
        tierClass,
        isLocked && "opacity-50 grayscale",
        className
      )}
    >
      {/* Icon */}
      <div className="flex flex-1 items-center justify-center" role="img" aria-label={name}>
        {renderIconComponent(icon, sizes.iconSize, "text-current")}
      </div>
      {/* Name strip */}
      <span
        className={cn(
          "font-heading w-full truncate text-center font-semibold tracking-widest uppercase",
          "text-[0.5rem] leading-none",
          isLocked ? "text-muted-foreground" : tierText
        )}
      >
        {name}
      </span>
      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
    </motion.div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex">{badge}</div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-48 space-y-1">
            <p className="font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
            <p className="text-xs">
              {tier} · {xpReward} XP
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
