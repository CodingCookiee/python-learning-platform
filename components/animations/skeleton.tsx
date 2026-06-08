import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse bg-muted rounded-none", className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-4 p-8 bg-card ring-1 ring-foreground/5", className)}>
      {/* Title bar */}
      <Skeleton className="h-5 w-2/3" />
      {/* Description lines */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      {/* Progress bar */}
      <Skeleton className="h-2 w-full mt-2" />
    </div>
  );
}

type SkeletonLineWidth = "25%" | "50%" | "75%" | "100%";

interface SkeletonLineProps {
  width?: SkeletonLineWidth;
  className?: string;
}

const widthMap: Record<SkeletonLineWidth, string> = {
  "25%": "w-1/4",
  "50%": "w-1/2",
  "75%": "w-3/4",
  "100%": "w-full",
};

export function SkeletonLine({ width = "100%", className }: SkeletonLineProps) {
  return <Skeleton className={cn("h-4", widthMap[width], className)} />;
}
