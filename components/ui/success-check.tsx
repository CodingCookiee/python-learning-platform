"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SuccessCheckProps {
  visible: boolean;
  size?: number;
  className?: string;
}

/**
 * Animated SVG checkmark that draws itself when `visible` becomes true.
 */
export function SuccessCheck({ visible, size = 48, className }: SuccessCheckProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className={cn("inline-flex items-center justify-center", className)}
          aria-hidden="true"
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Circle */}
            <motion.circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="3"
              className="text-emerald-500"
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            {/* Checkmark */}
            <motion.path
              d="M14 24l7 7 13-13"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-500"
              transition={{ duration: 0.35, delay: 0.3, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
