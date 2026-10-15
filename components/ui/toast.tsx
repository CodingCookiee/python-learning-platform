"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { KnotMark, SealMark, SnagMark } from "@/components/brand/marks";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (opts: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((opts: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...opts, id }]);
    const duration = opts.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <Toaster toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ─── Individual toast ─────────────────────────────────────────────────────────

/**
 * A toast is a slip pinned to the board: a belt-end rail in its tone with pylearn's own mark
 * (the seal for done, a cut belt for a snag, the knot for a notice), and a strip of tape along
 * the foot that runs out with the time it stays up.
 */
const toneMap: Record<ToastType, { mark: React.ReactNode; rail: string; ink: string }> = {
  success: {
    mark: <SealMark className="size-4" />,
    rail: "bg-seal",
    ink: "text-seal-foreground",
  },
  error: {
    mark: <SnagMark className="size-4" />,
    rail: "bg-destructive",
    ink: "text-background",
  },
  info: {
    mark: <KnotMark className="size-4" />,
    // The learner's own belt, inked with the keyline as the logo is, so it reads on a white belt too
    rail: "bg-[var(--loader-belt)]",
    ink: "text-[var(--keyline)]",
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tone = toneMap[toast.type];
  const duration = toast.duration ?? 4000;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex w-full max-w-sm overflow-hidden border border-border bg-sheet shadow-float"
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
    >
      <div className={cn("flex w-9 shrink-0 items-start justify-center pt-3.5", tone.rail, tone.ink)}>
        {tone.mark}
      </div>
      <div className="flex min-w-0 flex-1 items-start gap-3 py-3 pr-3 pl-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm leading-snug font-semibold">{toast.title}</p>
          {toast.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{toast.description}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="-m-1 shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Dismiss notification"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {duration > 0 && (
        <motion.span
          aria-hidden="true"
          className={cn("absolute right-0 bottom-0 left-9 h-0.5 origin-left motion-reduce:hidden", tone.rail)}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}

// ─── Toaster (renders the stack) ─────────────────────────────────────────────

function Toaster({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 sm:bottom-6 sm:right-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export { Toaster };
