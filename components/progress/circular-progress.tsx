"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

function AnimatedCount({ value }: { value: number }) {
  const count = useMotionValue(0);
  const springCount = useSpring(count, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    count.set(value);
  }, [value, count]);

  React.useEffect(() => {
    return springCount.on("change", (v) => setDisplay(Math.round(v)));
  }, [springCount]);

  return <>{display}</>;
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  className,
}: CircularProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const motionOffset = useMotionValue(circumference);
  const springOffset = useSpring(motionOffset, { stiffness: 80, damping: 20 });

  React.useEffect(() => {
    const targetOffset = circumference - (clampedValue / 100) * circumference;
    motionOffset.set(targetOffset);
  }, [clampedValue, circumference, motionOffset]);

  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
      role="img"
      aria-label={label ?? `${clampedValue}% complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Filled arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="square"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: springOffset }}
          transform={`rotate(-90 ${center} ${center})`}
          className="text-primary"
        />
      </svg>
      {/* Centered label overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-heading font-semibold leading-none tabular-nums"
          style={{ fontSize: size * 0.18 }}
        >
          <AnimatedCount value={clampedValue} />
          <span style={{ fontSize: size * 0.12 }} className="font-normal">
            %
          </span>
        </span>
        {label && (
          <span
            className="font-heading font-semibold tracking-widest uppercase text-muted-foreground mt-0.5"
            style={{ fontSize: Math.max(8, size * 0.07) }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
