"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cutStrips, type TapeStrip } from "@/components/brand/tape-fall";

/** One offcut of belt cloth: the dye, a keyline, and (sometimes) a rank bar across the end */
function Strip({ strip }: { strip: TapeStrip }) {
  return (
    <motion.div
      className="absolute top-0"
      style={{ left: `${strip.x * 100}%` }}
      initial={{ y: -40, x: 0, rotate: strip.tilt, opacity: 1 }}
      animate={{
        y: "105vh",
        x: [0, strip.sway, strip.sway * 0.4, strip.sway * 0.8],
        rotate: strip.tilt + strip.turn,
        opacity: [1, 1, 1, 0],
      }}
      transition={{ duration: strip.duration, delay: strip.delay, ease: [0.35, 0, 0.75, 1] }}
    >
      {/* The twist: flipping on its long axis like a ribbon */}
      <motion.div
        style={{
          transformPerspective: 400,
          width: strip.width,
          height: strip.length,
          backgroundColor: strip.dye,
          backgroundImage: strip.ranked
            ? "linear-gradient(to bottom, transparent 70%, var(--belt-black) 70%)"
            : undefined,
          boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--keyline) 45%, transparent)",
        }}
        animate={{ rotateX: [0, 180, 360] }}
        transition={{ duration: strip.twist, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

interface ConfettiEffectProps {
  onComplete?: () => void;
}

/**
 * The celebration overlay for a pass, a project or a new belt: offcuts of belt cloth and tape fall
 * across the page (components/brand/tape-fall.ts), then clear.
 */
export function ConfettiEffect({ onComplete }: ConfettiEffectProps) {
  const [strips] = React.useState<TapeStrip[]>(() => cutStrips(56));
  const [visible, setVisible] = React.useState(true);
  // Reduced motion: no falling strips (frozen ones would just be litter on the dialog)
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && !reduceMotion && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden="true"
        >
          {strips.map((strip) => (
            <Strip key={strip.id} strip={strip} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
