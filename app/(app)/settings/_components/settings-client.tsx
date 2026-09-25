"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Moon, Sun, Monitor, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { signOut } from "next-auth/react";

interface SettingsClientProps {
  initialName: string;
  email: string;
  hasPassword: boolean;
}

type Status = { type: "success" | "error"; message: string } | null;

function StatusBanner({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <AnimatePresence>
      <motion.p
        key={status.message}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`flex items-center gap-2 text-sm ${status.type === "success" ? "text-success" : "text-destructive"}`}
        role="status"
      >
        {status.type === "success" ? (
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        )}
        {status.message}
      </motion.p>
    </AnimatePresence>
  );
}

export function SettingsClient({ initialName, email, hasPassword }: SettingsClientProps) {
  const { theme, setTheme } = useTheme();
  // The theme is only known in the browser; render no selection on the server
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [name, setName] = React.useState(initialName);
  const [profileStatus, setProfileStatus] = React.useState<Status>(null);
  const [savingProfile, setSavingProfile] = React.useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setProfileStatus({ type: "error", message: "Enter a name to save." });
      return;
    }
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        setProfileStatus({ type: "error", message: "That didn't save. Try again in a moment." });
        return;
      }
      setProfileStatus({ type: "success", message: "Name saved." });
    } catch {
      setProfileStatus({ type: "error", message: "We couldn't reach the server. Check your connection." });
    } finally {
      setSavingProfile(false);
    }
  }

  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [pwStatus, setPwStatus] = React.useState<Status>(null);
  const [savingPw, setSavingPw] = React.useState(false);

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) {
      setPwStatus({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwStatus({ type: "error", message: "The two new passwords don't match." });
      return;
    }
    setSavingPw(true);
    setPwStatus(null);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPwStatus({ type: "error", message: data.error ?? "Failed to change password." });
        return;
      }
      setPwStatus({ type: "success", message: "Password changed." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch {
      setPwStatus({ type: "error", message: "We couldn't reach the server. Check your connection." });
    } finally {
      setSavingPw(false);
    }
  }

  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/settings/delete", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
        return;
      }
      setDeleteError("Your account wasn't deleted. Try again, or sign out and back in first.");
    } catch {
      setDeleteError("We couldn't reach the server, so nothing was deleted.");
    } finally {
      setDeleting(false);
    }
  }

  // Each option previews its own theme: ground, ink line, jade accent
  const themeOptions = [
    { value: "light" as const, label: "Light", Icon: Sun, ground: "#f1f6f0", ink: "#1d3b31", accent: "#2f8a6c" },
    { value: "dark" as const, label: "Dark", Icon: Moon, ground: "#111d18", ink: "#eaf2e8", accent: "#7fd3a8" },
    { value: "system" as const, label: "Automatic", Icon: Monitor, ground: "", ink: "", accent: "" },
  ];

  return (
    <div className="flex flex-col border-t border-border">
      <SettingsRow title="Name" description="Shown on your profile and training record.">
        <form
          onSubmit={(e) => {
            void handleSaveProfile(e);
          }}
          className="flex max-w-md flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-name">Display name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" value={email} disabled />
            <p className="text-sm text-muted-foreground">
              Your email is your sign-in, so it can&apos;t be changed here.
            </p>
          </div>
          <StatusBanner status={profileStatus} />
          <Button type="submit" disabled={savingProfile} className="w-fit">
            {savingProfile ? "Saving…" : "Save name"}
          </Button>
        </form>
      </SettingsRow>

      <SettingsRow
        title="Appearance"
        description="Light cotton or forest night. Automatic follows your device."
      >
        <div className="grid max-w-md grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
          {themeOptions.map(({ value, label, Icon, ground, ink, accent }) => {
            const selected = mounted && theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col gap-2 rounded-md border p-2 text-left text-sm font-medium transition-colors",
                  selected ? "border-primary bg-accent/60" : "border-border hover:border-foreground/35"
                )}
              >
                <span
                  className="flex h-14 flex-col justify-end gap-1.5 overflow-hidden rounded-sm border border-border p-2"
                  style={
                    ground
                      ? { backgroundColor: ground }
                      : { background: "linear-gradient(90deg, #f1f6f0 50%, #111d18 50%)" }
                  }
                  aria-hidden="true"
                >
                  {ground && (
                    <>
                      <span className="h-1.5 w-3/4 rounded-[1px]" style={{ backgroundColor: ink }} />
                      <span className="h-3 w-1/2 rounded-[1px]" style={{ backgroundColor: accent }} />
                    </>
                  )}
                </span>
                <span className="flex items-center gap-1.5 px-0.5">
                  <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsRow>

      {hasPassword && (
        <SettingsRow
          title="Password"
          description="At least 8 characters. You stay signed in on this device."
        >
          <form
            onSubmit={(e) => {
              void handleSavePassword(e);
            }}
            className="flex max-w-md flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="current-pw">Current password</Label>
              <Input
                id="current-pw"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <StatusBanner status={pwStatus} />
            <Button type="submit" disabled={savingPw} className="w-fit">
              {savingPw ? "Changing…" : "Change password"}
            </Button>
          </form>
        </SettingsRow>
      )}

      <SettingsRow
        title="Delete account"
        description="Removes your account, progress, achievements and submissions for good."
      >
        <div className="flex flex-col gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting} className="w-fit">
                <Trash2 aria-hidden="true" />
                {deleting ? "Deleting…" : "Delete my account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your belt, stripes, streak, achievements and submissions are deleted immediately.
                  This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my account</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    void handleDeleteAccount();
                  }}
                  className="bg-destructive text-sheet hover:bg-destructive/90"
                >
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
        </div>
      </SettingsRow>
    </div>
  );
}

/** One settings row: heading and help text on the left, controls on the right */
function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-border py-8 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
