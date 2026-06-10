"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotate: number;
  /** Pre-computed so Math.random() is never called during render */
  isCircle: boolean;
}

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#06b6d4"];

function generatePieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    size: Math.random() * 8 + 6,
    delay: Math.random() * 0.6,
    duration: Math.random() * 1.5 + 1.5,
    rotate: Math.random() * 720 - 360,
    isCircle: Math.random() > 0.5,
  }));
}

interface ConfettiEffectProps {
  onComplete?: () => void;
}

export function ConfettiEffect({ onComplete }: ConfettiEffectProps) {
  const [pieces] = React.useState<ConfettiPiece[]>(() => generatePieces(60));
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden="true"
        >
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute top-0"
              style={{
                left: `${piece.x}%`,
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                borderRadius: piece.isCircle ? "50%" : "2px",
              }}
              initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
              animate={{
                y: "100vh",
                opacity: [1, 1, 0],
                rotate: piece.rotate,
                scale: [1, 0.8, 0.6],
              }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: "easeIn",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
