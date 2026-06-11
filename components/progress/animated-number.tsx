"use client";

import * as React from "react";
import { useMotionValue, useSpring } from "framer-motion";

export interface AnimatedNumberProps {
  value: number;
  /** Spring stiffness (default 80) */
  stiffness?: number;
  /** Spring damping (default 20) */
  damping?: number;
  /** Optional CSS class */
  className?: string;
  /** If provided, appended after the number */
  suffix?: string;
  /** If provided, prepended before the number */
  prefix?: string;
  /** Locale for number formatting (default "en-US") */
  locale?: string;
  /** toLocaleString options */
  formatOptions?: Intl.NumberFormatOptions;
}

/**
 * Animated counting number that spring-animates from its previous value to a new one.
 * Uses Framer Motion's useSpring for smooth, physics-based counting.
 */
export function AnimatedNumber({
  value,
  stiffness = 80,
  damping = 20,
  className,
  suffix = "",
  prefix = "",
  locale = "en-US",
  formatOptions,
}: AnimatedNumberProps) {
  const motionVal = useMotionValue(value);
  const spring = useSpring(motionVal, { stiffness, damping });
  const [display, setDisplay] = React.useState(value);

  React.useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  React.useEffect(() => {
    return spring.on("change", (v) => setDisplay(Math.round(v)));
  }, [spring]);

  const formatted = formatOptions
    ? display.toLocaleString(locale, formatOptions)
    : display.toLocaleString(locale);

  return (
    <span className={className} aria-live="polite" aria-atomic="true">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
