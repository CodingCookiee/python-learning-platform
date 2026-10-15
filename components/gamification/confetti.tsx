"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { cutStrips, resolveDye } from "@/components/brand/tape-fall";

/**
 * The celebration burst inside a panel (a passed drill, an unlocked achievement): offcuts of belt
 * cloth and tape thrown up from the middle, falling and twisting like ribbon
 * (components/brand/tape-fall.ts). Drawn on a canvas so it stays cheap inside busy pages.
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

interface Piece {
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number;
  spin: number;
  /** Phase of the ribbon twist; its cosine squashes the strip as it turns edge-on */
  twist: number;
  twistRate: number;
  width: number;
  length: number;
  dye: string;
  ranked: boolean;
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
    // A burst of moving strips is exactly what reduced motion asks to leave out; the pass is
    // still celebrated by the seal, the XP and the toasts
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to parent, sharp on high-density screens
    const parent = canvas.parentElement;
    const cssWidth = parent?.clientWidth || 400;
    const cssHeight = parent?.clientHeight || 400;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = cssWidth * ratio;
    canvas.height = cssHeight * ratio;
    ctx.scale(ratio, ratio);

    const keyline = resolveDye("var(--keyline)");
    const rankBar = resolveDye("var(--belt-black)");
    const dyes = new Map<string, string>();

    // Thrown up from the middle third, then gravity takes them
    const pieces: Piece[] = cutStrips(particleCount).map((strip) => {
      if (!dyes.has(strip.dye)) dyes.set(strip.dye, resolveDye(strip.dye));
      return {
        x: cssWidth * (0.3 + strip.x * 0.4),
        y: cssHeight * 0.35,
        dx: strip.sway / 20,
        dy: -(4 + Math.random() * 5),
        angle: strip.tilt,
        spin: strip.turn / 60,
        twist: Math.random() * Math.PI,
        twistRate: (Math.PI * 2) / (strip.twist * 60),
        width: strip.width,
        length: strip.length,
        dye: dyes.get(strip.dye)!,
        ranked: strip.ranked,
      };
    });

    startTimeRef.current = null;

    function draw(timestamp: number) {
      if (!ctx || !canvas) return;

      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      let anyVisible = false;
      // Fade over the last quarter
      const opacity = progress < 0.75 ? 1 : 1 - (progress - 0.75) / 0.25;

      for (const p of pieces) {
        // Gravity, with a little air drag so they flutter rather than drop
        p.dy = Math.min(p.dy + 0.16, 3.4);
        p.dx *= 0.985;
        p.x += p.dx + Math.sin(p.twist) * 0.35;
        p.y += p.dy;
        p.angle += p.spin;
        p.twist += p.twistRate;

        if (p.y < cssHeight + p.length) {
          anyVisible = true;
        }

        const squash = Math.cos(p.twist);
        ctx.save();
        ctx.globalAlpha = Math.max(0, opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.scale(1, Math.max(Math.abs(squash), 0.08));
        const w = p.width;
        const h = p.length;
        ctx.fillStyle = p.dye;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        if (p.ranked) {
          ctx.fillStyle = rankBar;
          ctx.fillRect(-w / 2, h * 0.2, w, h * 0.3);
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = keyline;
        ctx.globalAlpha = Math.max(0, opacity) * 0.45;
        ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
        ctx.restore();
      }

      if (anyVisible && elapsed < duration) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, cssWidth, cssHeight);
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
      className={`pointer-events-none absolute inset-0 z-50 h-full w-full ${className ?? ""}`}
    />
  );
}
