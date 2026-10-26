"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PASSWORD_RULE, passwordProblem } from "@/lib/validations/password";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, Moon, Sun, Monitor, Trash2 } from "lucide-react";
import { SnagMark } from "@/components/brand/marks";
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
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigation-progress";
import { AiSettings } from "./ai-settings";
import type { CredentialSummary, UsageSummary } from "@/lib/ai/credentials";
import { forgetAccountStorage } from "@/lib/account-storage";

interface SettingsClientProps {
  initialName: string;
  email: string;
  hasPassword: boolean;
  ai: { credential: CredentialSummary | null; usage: UsageSummary; available: boolean };
}

type Status = { type: "success" | "error"; message: string } | null;
type PwField = "current" | "new" | "confirm";

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
        // A problem is announced at once; a confirmation waits its turn
        role={status.type === "error" ? "alert" : "status"}
      >
        {status.type === "success" ? (
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <SnagMark className="size-4 shrink-0" />
        )}
        {status.message}
      </motion.p>
    </AnimatePresence>
  );
}

export function SettingsClient({ initialName, email, hasPassword, ai }: SettingsClientProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // The theme is only known in the browser; render no selection on the server
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [name, setName] = React.useState(initialName);
  const [savedName, setSavedName] = React.useState(initialName);
  const [profileStatus, setProfileStatus] = React.useState<Status>(null);
  // A refusal about the name itself shows under the name field, tied to it
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [savingProfile, setSavingProfile] = React.useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setProfileStatus(null);
      setNameError("Enter a name to save.");
      return;
    }
    setSavingProfile(true);
    setProfileStatus(null);
    setNameError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        // A 400 is the server refusing the name as written
        if (res.status === 400 && data.error) setNameError(data.error);
        else setProfileStatus({ type: "error", message: "That didn't save. Try again in a moment." });
        return;
      }
      setSavedName(trimmed);
      setProfileStatus({ type: "success", message: "Name saved." });
    } catch {
      setProfileStatus({ type: "error", message: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setSavingProfile(false);
    }
  }

  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [pwStatus, setPwStatus] = React.useState<Status>(null);
  // Which field an error belongs to, so it shows under that field and is read with it
  const [pwField, setPwField] = React.useState<PwField | null>(null);
  const [savingPw, setSavingPw] = React.useState(false);

  function pwErrorProps(field: PwField) {
    const has = pwField === field && pwStatus?.type === "error";
    return {
      "aria-invalid": has || undefined,
      "aria-describedby": has ? `${field}-pw-error` : undefined,
    };
  }

  function pwFieldError(field: PwField) {
    if (pwField !== field || pwStatus?.type !== "error") return null;
    return (
      <p id={`${field}-pw-error`} role="alert" className="text-sm text-destructive">
        {pwStatus.message}
      </p>
    );
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(newPw, { email, name: initialName ?? undefined });
    if (problem) {
      setPwField("new");
      setPwStatus({ type: "error", message: problem });
      return;
    }
    if (newPw === currentPw) {
      setPwField("new");
      setPwStatus({ type: "error", message: "That's the password you have now. Choose a new one." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwField("confirm");
      setPwStatus({ type: "error", message: "The two new passwords don't match." });
      return;
    }
    setSavingPw(true);
    setPwStatus(null);
    setPwField(null);
    let leaving = false;
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      // An error page that isn't JSON (a crash) still gets the right message, not "couldn't reach"
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        // A wrong current password belongs to that field; the rest are about the new one
        if (res.status === 400) setPwField(/current password/i.test(data.error ?? "") ? "current" : "new");
        setPwStatus({
          type: "error",
          message: (res.status === 400 || res.status === 429) && data.error ? data.error : "Your password wasn't changed. Try again.",
        });
        return;
      }
      // The change ends every session, this one included (User.sessionVersion), so sign this
      // device straight back in with the new password
      const again = await signIn("credentials", { email, password: newPw, redirect: false });
      if (!again || again.error) {
        // Busy until the sign-in page replaces this one
        leaving = true;
        startNavigation();
        router.push("/auth/signin?signedout=1");
        return;
      }
      setPwStatus({ type: "success", message: "Password changed. You've been signed out everywhere else." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch {
      setPwStatus({ type: "error", message: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      if (!leaving) setSavingPw(false);
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
        // Deleted: nothing of the account stays in the browser, then signing out takes it home
        forgetAccountStorage();
        await signOut({ callbackUrl: "/" });
        return;
      }
      // A refusal with a reason (the last super admin) says it; anything else gets the general line
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setDeleteError(
        res.status === 409 && data?.error
          ? `Your account wasn't deleted. ${data.error}`
          : "Your account wasn't deleted. Try again, or sign out and back in first."
      );
      setDeleting(false);
    } catch {
      setDeleteError("We couldn't reach the server, so nothing was deleted.");
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
        <form method="post"
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
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              maxLength={80}
              autoComplete="name"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "settings-name-error" : undefined}
            />
            {nameError && (
              <p id="settings-name-error" role="alert" className="text-sm text-destructive">
                {nameError}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" value={email} disabled />
            <p className="text-sm text-muted-foreground">
              Your email is your sign-in, so it can&apos;t be changed here.
            </p>
          </div>
          <StatusBanner status={profileStatus} />
          {/* A save is the page's primary only when it has something to save */}
          <LoadingButton
            type="submit"
            variant={name.trim() !== savedName.trim() ? "default" : "outline"}
            loading={savingProfile}
            loadingText="Saving…"
            className="w-fit"
          >
            Save name
          </LoadingButton>
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

      <SettingsRow
        title="AI tutor"
        description="The drill tutor and error explainer run on your own Anthropic, OpenAI or Google Gemini key, so you pay your provider directly. Everything else works without one."
      >
        <AiSettings initialCredential={ai.credential} usage={ai.usage} available={ai.available} />
      </SettingsRow>

      {hasPassword && (
        <SettingsRow
          title="Password"
          description={`${PASSWORD_RULE} Changing it signs you out everywhere else; you stay signed in here.`}
        >
          <form method="post"
            onSubmit={(e) => {
              void handleSavePassword(e);
            }}
            className="flex max-w-md flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="current-pw">Current password</Label>
              <PasswordInput
                id="current-pw"
                what="current password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
                {...pwErrorProps("current")}
              />
              {pwFieldError("current")}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-pw">New password</Label>
              <PasswordInput
                id="new-pw"
                what="new password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                {...pwErrorProps("new")}
              />
              {pwFieldError("new")}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <PasswordInput
                id="confirm-pw"
                what="confirmation"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                {...pwErrorProps("confirm")}
              />
              {pwFieldError("confirm")}
            </div>
            {/* Success, and errors that aren't about one field (the server couldn't be reached) */}
            {!pwField && <StatusBanner status={pwStatus} />}
            <LoadingButton
              type="submit"
              variant={currentPw && newPw && confirmPw ? "default" : "outline"}
              loading={savingPw}
              loadingText="Changing…"
              className="w-fit"
            >
              Change password
            </LoadingButton>
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
              <LoadingButton variant="destructive" loading={deleting} loadingText="Deleting your account…" icon={<Trash2 aria-hidden="true" />} className="w-fit">
                Delete my account
              </LoadingButton>
            </AlertDialogTrigger>
            <AlertDialogContent tone="destructive">
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
