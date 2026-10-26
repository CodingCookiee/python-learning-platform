"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigation-progress";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive";

/** What the action sends (POST /api/admin/users/[id]); `field` adds the dialog's text under this key */
export interface ActionSpec {
  action: string;
  [key: string]: unknown;
}

async function run(
  userId: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    return res.ok
      ? { ok: true, message: data.message ?? "Done." }
      : { ok: false, message: data.error ?? "That didn't work." };
  } catch {
    return { ok: false, message: "We couldn't reach the server." };
  }
}

/**
 * One admin action as a button. With `confirm`, it opens a dialog first, optionally with a text
 * field (a reason, or the email typed back before a deletion). The result is said beside the button
 * and the page refreshes to show the change.
 */
export function AdminAction({
  userId,
  spec,
  label,
  busyLabel,
  variant = "outline",
  size = "sm",
  confirm,
  className,
  redirectTo,
}: {
  userId: string;
  spec: ActionSpec;
  label: string;
  busyLabel: string;
  variant?: Variant;
  size?: "sm" | "xs" | "default";
  confirm?: {
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    destructive?: boolean;
    /** A text field in the dialog, sent as spec[field.name] */
    field?: {
      name: string;
      label: string;
      placeholder?: string;
      required?: boolean;
      mustEqual?: string;
    };
    /** A yes/no in the dialog, sent as spec[checkbox.name] */
    checkbox?: {
      name: string;
      label: string;
      hint?: string;
      defaultChecked?: boolean;
    };
  };
  className?: string;
  /** Go here afterwards instead of refreshing (after a deletion, the page is gone) */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [checked, setChecked] = React.useState(Boolean(confirm?.checkbox?.defaultChecked));
  const fieldId = React.useId();
  const checkId = React.useId();

  async function go() {
    setBusy(true);
    setResult(null);
    const body = {
      ...spec,
      ...(confirm?.field ? { [confirm.field.name]: text } : {}),
      ...(confirm?.checkbox ? { [confirm.checkbox.name]: checked } : {}),
    };
    const r = await run(userId, body);
    setBusy(false);
    setResult(r);
    if (r.ok) {
      setOpen(false);
      setText("");
      if (redirectTo) {
        startNavigation();
        router.push(redirectTo);
      } else router.refresh();
    }
  }

  const field = confirm?.field;
  const ready =
    !field?.required ||
    (field.mustEqual
      ? text.trim().toLowerCase() === field.mustEqual.toLowerCase()
      : text.trim() !== "");
  const button = (
    <LoadingButton
      type="button"
      variant={variant}
      size={size}
      loading={busy && !open}
      loadingText={busy && !open ? busyLabel : undefined}
      onClick={confirm ? undefined : () => void go()}
    >
      {label}
    </LoadingButton>
  );

  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      {confirm ? (
        <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
          <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
          <AlertDialogContent tone={confirm.destructive ? "destructive" : undefined}>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="flex flex-col gap-2">{confirm.description}</div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            {field && (
              <div className="flex flex-col gap-2">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <Input
                  id={fieldId}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            )}
            {confirm.checkbox && (
              <div className="flex items-start gap-2.5">
                <input
                  id={checkId}
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  aria-describedby={confirm.checkbox.hint ? `${checkId}-hint` : undefined}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                />
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor={checkId}>{confirm.checkbox.label}</Label>
                  {confirm.checkbox.hint && (
                    <p id={`${checkId}-hint`} className="text-xs text-muted-foreground">
                      {confirm.checkbox.hint}
                    </p>
                  )}
                </div>
              </div>
            )}
            {result && !result.ok && (
              <p role="alert" className="text-sm text-destructive">
                {result.message}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <LoadingButton
                type="button"
                variant={confirm.destructive ? "destructive" : "default"}
                loading={busy}
                loadingText={busyLabel}
                disabled={!ready}
                onClick={() => void go()}
              >
                {confirm.confirmLabel}
              </LoadingButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        button
      )}
      {result && (!confirm || result.ok) && (
        <span
          role={result.ok ? "status" : "alert"}
          className={cn("text-xs", result.ok ? "text-muted-foreground" : "text-destructive")}
        >
          {result.message}
        </span>
      )}
    </span>
  );
}

/** For actions that need no dialog but sit in a row of plain buttons */
export function AdminActionGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-start gap-2">{children}</div>;
}
