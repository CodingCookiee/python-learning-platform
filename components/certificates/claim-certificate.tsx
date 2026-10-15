"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { CertificateSheet } from "@/components/certificates/certificate-sheet";
import { CERTIFICATE, NAME_MAX, validateName, type CertificateTrack } from "@/lib/certificate-rules";

/**
 * Claiming a certificate: the learner confirms the name to print against a live preview, then it's
 * issued. Like tying the white belt, it's a moment: the seal is pressed onto the preview before the
 * certificate's own page opens.
 */
export function ClaimCertificate({
  track,
  defaultName,
  origin,
  size = "default",
}: {
  track: CertificateTrack;
  defaultName: string;
  /** The site's origin, for the address previewed in the foot */
  origin: string;
  size?: "default" | "lg";
}) {
  const router = useRouter();
  const words = CERTIFICATE[track];
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(defaultName);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [issued, setIssued] = React.useState<string | null>(null);

  const checked = validateName(draft);
  const previewName = checked.ok ? checked.name : draft.trim() || defaultName;
  const placeholder = `${words.prefix}-····-····`;

  async function claim(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, name: checked.name }),
      });
      const data = (await res.json().catch(() => null)) as { certificate?: { code: string }; error?: string } | null;
      if (!res.ok || !data?.certificate) {
        setError(data?.error ?? "The certificate couldn't be issued. Try again in a moment.");
        setBusy(false);
        return;
      }
      // The seal goes on, then its page opens; busy until that page replaces this one
      setIssued(data.certificate.code);
      const code = data.certificate.code;
      window.setTimeout(() => router.push(`/certificates/${code}`), 1100);
    } catch {
      setError("We couldn't reach the server. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        Claim your certificate
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto" showCloseButton={!busy}>
          <form method="post" onSubmit={(event) => void claim(event)} className="grid gap-6">
            <DialogHeader>
              <DialogTitle className="font-condensed text-3xl leading-none font-extrabold tracking-[-0.02em]">
                {words.title}
              </DialogTitle>
              <DialogDescription>
                You&apos;ve earned it. Check the name as it will be printed; you can change it later.
              </DialogDescription>
            </DialogHeader>

            {/* What will print, as you type; the dialog's own words say the same, so it's hidden from screen readers */}
            <div aria-hidden="true" inert>
              <CertificateSheet
                track={track}
                name={previewName}
                code={issued ?? placeholder}
                issuedAt={new Date()}
                url={`${origin}/certificates/${issued ?? placeholder}`}
                heading="p"
                stamp={issued ? "animate" : "none"}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="claim-name">Name to print</Label>
              <Input
                id="claim-name"
                name="name"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                }}
                maxLength={NAME_MAX}
                autoComplete="name"
                aria-describedby={error ? "claim-name-note claim-name-error" : "claim-name-note"}
                aria-invalid={error ? true : undefined}
                disabled={busy}
              />
              <p id="claim-name-note" className="text-sm text-muted-foreground">
                Use the name you&apos;d put on a CV.
              </p>
              {error && (
                <p id="claim-name-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-start">
              <LoadingButton type="submit" loading={busy} loadingText={issued ? "Opening your certificate…" : "Issuing…"}>
                Issue my certificate
              </LoadingButton>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Not now
              </Button>
            </DialogFooter>
            <p className="sr-only" role="status">
              {issued ? `Issued. Certificate ${issued}. Opening its page.` : ""}
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
