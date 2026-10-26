"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

/** Marks every one of the admin's notices read, then refreshes the list */
export function MarkAllRead() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <LoadingButton
        variant="outline"
        size="sm"
        loading={busy}
        loadingText="Marking…"
        icon={<CheckCheck aria-hidden="true" />}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          const res = await fetch("/api/admin/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }).catch(() => null);
          setBusy(false);
          if (!res?.ok) return setFailed(true);
          router.refresh();
        }}
      >
        Mark all read
      </LoadingButton>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          They weren&apos;t marked read. Try again in a moment.
        </p>
      )}
    </div>
  );
}
