"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, ExternalLink, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { NAME_MAX } from "@/lib/certificate-rules";

/**
 * What the holder can do with their certificate's page (visitors see none of it): keep it (PDF,
 * image), share it (link, LinkedIn), fix the printed name, and withdraw or restore the public page.
 */
export function HolderControls({
  code,
  name,
  title,
  url,
  withdrawn,
  linkedIn,
}: {
  code: string;
  name: string;
  title: string;
  url: string;
  withdrawn: boolean;
  linkedIn: string;
}) {
  const router = useRouter();
  const [, startRefresh] = React.useTransition();
  const [copied, setCopied] = React.useState(false);
  const [draft, setDraft] = React.useState(name);
  const [saving, setSaving] = React.useState<"name" | "withdraw" | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState("");

  async function change(body: { name: string } | { withdrawn: boolean }, done: string) {
    setSaving("name" in body ? "name" : "withdraw");
    setError(null);
    try {
      const res = await fetch(`/api/certificates/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "That didn't save. Try again in a moment.");
        return;
      }
      setConfirmWithdraw(false);
      setSaid(done);
      startRefresh(() => router.refresh());
    } catch {
      setError("We couldn't reach the server. Try again in a moment.");
    } finally {
      setSaving(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setSaid("Link copied.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy here. Select the link above and copy it.");
    }
  }

  const nameChanged = draft.replace(/\s+/g, " ").trim() !== name;

  return (
    <section aria-labelledby="holder-heading" className="flex flex-col gap-6 border-t border-border pt-6 print:hidden">
      <h2 id="holder-heading" className="text-xl font-semibold">
        Your certificate
      </h2>

      <div className="flex flex-wrap gap-3">
        {/* The print stylesheet lays it out on one A4 landscape page; "Save as PDF" is in the dialog */}
        <Button onClick={() => window.print()}>
          <FileDown aria-hidden="true" />
          Download PDF
        </Button>
        <Button variant="outline" asChild>
          <a href={`/certificates/${code}/image`} download={`${name}, pylearn ${title}.png`}>
            <Download aria-hidden="true" />
            Download image
          </a>
        </Button>
        <Button variant="outline" onClick={() => void copyLink()}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button variant="outline" asChild>
          <a href={linkedIn} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" />
            Add to LinkedIn
          </a>
        </Button>
      </div>

      <form method="post"
        className="flex max-w-xl flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (nameChanged) void change({ name: draft }, "The printed name is changed.");
        }}
      >
        <Label htmlFor="certificate-name">Printed name</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="certificate-name"
            name="name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="name"
            className="min-w-0 flex-1 basis-56"
          />
          <LoadingButton type="submit" variant="outline" loading={saving === "name"} loadingText="Saving…" disabled={!nameChanged}>
            Save name
          </LoadingButton>
        </div>
        <p className="text-sm text-muted-foreground">As you&apos;d put it on a CV. The certificate and its image update straight away.</p>
      </form>

      <div className="flex max-w-xl flex-col gap-3">
        {withdrawn ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">The public page is withdrawn. Restore it and the link works again.</p>
            <LoadingButton variant="outline" loading={saving === "withdraw"} loadingText="Restoring…" onClick={() => void change({ withdrawn: false }, "The public page is restored.")}>
              Restore the public page
            </LoadingButton>
          </div>
        ) : confirmWithdraw ? (
          <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-sheet p-4">
            <p className="text-sm">
              Withdraw it? Anyone following the link will be told there&apos;s no certificate here, and the image stops
              loading. You can restore it any time.
            </p>
            <div className="flex flex-wrap gap-2">
              <LoadingButton variant="outline" loading={saving === "withdraw"} loadingText="Withdrawing…" onClick={() => void change({ withdrawn: true }, "The public page is withdrawn.")}>
                Withdraw the page
              </LoadingButton>
              <Button variant="ghost" onClick={() => setConfirmWithdraw(false)} disabled={saving !== null}>
                Keep it public
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">Anyone with the link can see this page. It isn&apos;t listed in search engines.</p>
            <Button variant="ghost" onClick={() => setConfirmWithdraw(true)} className="-ml-3">
              Withdraw the public page
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="sr-only" role="status">
        {said}
      </p>
    </section>
  );
}
