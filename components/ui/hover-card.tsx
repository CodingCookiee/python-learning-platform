"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  /** If true, applies a lift + shadow on hover */
  lift?: boolean;
}

/**
 * Wraps children in a Framer Motion div that scales up slightly and adds a
 * shadow on hover — ideal for interactive card elements like module cards,
 * lesson items, and clickable list entries.
 */
export function HoverCard({ children, className, lift = true }: HoverCardProps) {
  return (
    <motion.div
      className={cn("cursor-pointer", className)}
      whileHover={lift ? { scale: 1.015, boxShadow: "0 8px 30px rgba(0,0,0,0.10)" } : undefined}
      whileTap={lift ? { scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}
