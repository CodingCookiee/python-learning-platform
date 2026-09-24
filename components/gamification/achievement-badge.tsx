"use client";

import * as React from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { renderAchievementIcon } from "@/lib/achievement-icon";
import { tierStyle } from "@/lib/achievement-tier";
import { LockedMark } from "@/components/brand/marks";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface AchievementBadgeProps {
  name: string;
  description: string;
  icon: string;
  tier: string;
  category: string;
  xpReward: number;
  unlockedAt?: Date | string | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { box: "size-14", icon: 22 },
  md: { box: "size-20", icon: 32 },
  lg: { box: "size-28", icon: 44 },
};

/**
 * An achievement as an embroidered patch: square-cut cloth in the tier's
 * colour with an inner stitch line. Locked patches are dashed outlines, like
 * the ranks still in preparation.
 */
export function AchievementPatch({
  icon,
  tier,
  locked = false,
  size = "md",
  label,
  className,
}: {
  icon: string;
  tier: string;
  locked?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const t = tierStyle(tier);
  const s = sizeConfig[size];
  const style = locked
    ? undefined
    : ({ backgroundColor: t.fill, borderColor: t.thread, color: t.ink } as CSSProperties);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-sm border-2 p-1",
        locked && "border-dashed border-(--keyline)/50 bg-transparent text-muted-foreground/60",
        s.box,
        className
      )}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <span
        className={cn(
          "flex size-full items-center justify-center border border-dashed",
          locked ? "border-transparent" : "border-current/35"
        )}
      >
        {locked ? (
          <LockedMark style={{ width: s.icon * 0.8, height: s.icon * 0.8 }} />
        ) : (
          renderAchievementIcon({ iconName: icon, size: s.icon })
        )}
      </span>
    </span>
  );
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
  const locked = unlockedAt == null;
  const t = tierStyle(tier);
  const badge = (
    <AchievementPatch
      icon={icon}
      tier={tier}
      locked={locked}
      size={size}
      label={locked ? `${name} (locked)` : name}
      className={className}
    />
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{badge}</span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex max-w-52 flex-col gap-1">
            <p className="font-semibold">{name}</p>
            <p className="text-xs opacity-80">{description}</p>
            <p className="font-condensed tabular text-xs">
              {t.label} · {xpReward} XP{locked ? " · locked" : ""}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
