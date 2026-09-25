import * as React from "react";
import {
  Blocks,
  BookOpen,
  Braces,
  Building,
  Calculator,
  SquareCheck,
  Cog,
  Crown,
  Database,
  Diamond,
  FileStack,
  GitBranch,
  Globe,
  Hammer,
  Layers,
  Link,
  Lock,
  Microscope,
  Network,
  Package,
  Rocket,
  Send,
  Server,
  Shield,
  Sparkles,
  TestTube,
  Type,
  Wind,
  Workflow,
  Code,
  ChartColumn,
  CircleCheck,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { SealMark, StreakMark, TapeMark } from "@/components/brand/marks";

type IconComponent = LucideIcon | ((props: { className?: string }) => React.ReactNode);

/**
 * Curated icon set for achievements, keyed by the `icon` column in the seed.
 * Concepts pylearn owns (streaks, XP) use its authored marks; subject matter
 * uses lucide at the same stroke. Unknown names fall back to the seal.
 */
const ACHIEVEMENT_ICONS: Record<string, IconComponent> = {
  Blocks,
  BookOpen,
  Braces,
  Building,
  Calculator,
  CheckSquare: SquareCheck,
  Cog,
  Crown,
  Database,
  Diamond,
  FileStack,
  Flame: StreakMark,
  GitBranch,
  Globe,
  Hammer,
  Layers,
  Link,
  Lock,
  Microscope,
  Network,
  Package,
  Rocket,
  Send,
  Server,
  Shield,
  Sparkles,
  TestTube,
  Type,
  Wind,
  Workflow,
  Flow: Workflow,
  Snake: Code,
  Code2: Code,
  BarChart3: ChartColumn,
  CheckCircle2: CircleCheck,
  Wand2: WandSparkles,
  Zap: TapeMark,
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
  const Icon = ACHIEVEMENT_ICONS[iconName] ?? SealMark;
  const node = (
    <Icon
      className={className}
      {...({ style: { width: size, height: size }, strokeWidth: 1.75 } as Record<string, unknown>)}
    />
  );
  if (!ariaLabel) return node;
  return (
    <span role="img" aria-label={ariaLabel} className="inline-flex">
      {node}
    </span>
  );
}
