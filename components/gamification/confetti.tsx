"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

/**
 * Canvas-based confetti burst component.
 *
 * IMPORTANT: The parent element must have `position: relative` and `overflow: hidden`
 * for the canvas overlay to be properly contained.
 */
export interface ConfettiProps {
  active: boolean;
  duration?: number;
  particleCount?: number;
  className?: string;
}

// Palette only: belt dyes, jade, straw and tape (canvas can't read CSS vars)
const COLORS = [
  "oklch(0.6 0.11 162)", // jade
  "oklch(0.88 0.12 95)", // straw
  "oklch(0.72 0.1 145)", // leaf belt
  "oklch(0.66 0.085 240)", // denim belt
  "oklch(0.57 0.065 60)", // cocoa belt
  "oklch(0.97 0.008 100)", // tape
];

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotation: number;
  dRotation: number;
  color: string;
  opacity: number;
}

export function Confetti({
  active,
  duration = 3000,
  particleCount = 60,
  className,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to parent
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth || 400;
      canvas.height = parent.clientHeight || 400;
    }

    const w = canvas.width;

    // Generate particles
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: w * 0.2 + Math.random() * w * 0.6,
      y: 0,
      dx: (Math.random() - 0.5) * 6,
      dy: 2 + Math.random() * 6,
      rotation: Math.random() * 360,
      dRotation: (Math.random() - 0.5) * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? COLORS[0],
      opacity: 1,
    }));

    startTimeRef.current = null;

    function draw(timestamp: number) {
      if (!ctx || !canvas) return;

      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let anyVisible = false;

      for (const p of particles) {
        // Gravity
        p.dy += 0.15;
        p.x += p.dx;
        p.y += p.dy;
        p.rotation += p.dRotation;
        // Fade in last quarter
        p.opacity = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

        if (p.y < canvas.height) {
          anyVisible = true;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-3, -5, 6, 10);
        ctx.restore();
      }

      if (anyVisible && elapsed < duration) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, duration, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full z-50 ${className ?? ""}`}
    />
  );
}
