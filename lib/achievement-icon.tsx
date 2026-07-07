import * as React from "react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

const iconAliases: Record<string, keyof typeof LucideIcons> = {
  Snake: "Code2",
  Flow: "Workflow",
};

type AchievementIconProps = {
  iconName: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
};

export function renderAchievementIcon({
  iconName,
  size = 20,
  className,
  ariaLabel,
}: AchievementIconProps): React.ReactNode {
  const resolvedIconName = iconAliases[iconName] ?? iconName;
  const IconComponent = LucideIcons[resolvedIconName as keyof typeof LucideIcons] as
    | React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>
    | undefined;

  if (IconComponent) {
    return (
      <IconComponent size={size} className={className} aria-hidden={ariaLabel ? undefined : true} />
    );
  }

  return (
    <span
      className={cn("inline-flex items-center justify-center leading-none", className)}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      {resolvedIconName}
    </span>
  );
}
