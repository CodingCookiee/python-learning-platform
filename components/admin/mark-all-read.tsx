"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

/** Marks every one of the admin's notices read, then refreshes the list */
export function MarkAllRead() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <LoadingButton
      variant="outline"
      size="sm"
      loading={busy}
      loadingText="Marking…"
      icon={<CheckCheck aria-hidden="true" />}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
    >
      Mark all read
    </LoadingButton>
  );
}
