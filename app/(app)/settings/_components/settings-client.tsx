"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
        className={`flex items-center gap-2 text-sm ${status.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
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

  const [name, setName] = React.useState(initialName);
  const [profileStatus, setProfileStatus] = React.useState<Status>(null);
  const [savingProfile, setSavingProfile] = React.useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setProfileStatus({ type: "error", message: "Name cannot be empty." });
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
        setProfileStatus({ type: "error", message: "Failed to save." });
        return;
      }
      setProfileStatus({ type: "success", message: "Profile updated." });
    } catch {
      setProfileStatus({ type: "error", message: "Network error." });
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
      setPwStatus({ type: "error", message: "Passwords do not match." });
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
      setPwStatus({ type: "success", message: "Password changed successfully." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch {
      setPwStatus({ type: "error", message: "Network error." });
    } finally {
      setSavingPw(false);
    }
  }

  const [deleting, setDeleting] = React.useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/delete", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      }
    } catch {
      /* silent */
    } finally {
      setDeleting(false);
    }
  }

  const themeOptions = [
    { value: "light" as const, label: "Light", Icon: Sun },
    { value: "dark" as const, label: "Dark", Icon: Moon },
    { value: "system" as const, label: "System", Icon: Monitor },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              void handleSaveProfile(e);
            }}
            className="flex flex-col gap-4 max-w-sm"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-name" className="text-sm font-medium">
                Display Name
              </label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} disabled aria-label="Email address (cannot be changed)" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <StatusBanner status={profileStatus} />
            <Button type="submit" disabled={savingProfile} className="w-fit">
              {savingProfile ? "Saving\u2026" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose your preferred theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3" role="radiogroup" aria-label="Theme selection">
            {themeOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-sm border px-5 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  theme === value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {hasPassword && (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your account password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                void handleSavePassword(e);
              }}
              className="flex flex-col gap-4 max-w-sm"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="current-pw" className="text-sm font-medium">
                  Current Password
                </label>
                <Input
                  id="current-pw"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-pw" className="text-sm font-medium">
                  New Password
                </label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirm-pw" className="text-sm font-medium">
                  Confirm New Password
                </label>
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
                {savingPw ? "Changing\u2026" : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Permanently delete your account and all data.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="size-4" aria-hidden="true" />
                {deleting ? "Deleting\u2026" : "Delete Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This is permanent and cannot be undone. All your progress, achievements, and data
                  will be deleted immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    void handleDeleteAccount();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
