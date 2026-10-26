"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

/** Expires the public pages' cached syllabus numbers, so a content sync shows now, not within the hour */
export function RefreshPublicPages() {
  const [state, setState] = React.useState<"idle" | "working" | "done" | "error">("idle");

  async function refresh() {
    setState("working");
    try {
      const res = await fetch("/api/admin/content/refresh", { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <LoadingButton
        type="button"
        variant="outline"
        size="sm"
        loading={state === "working"}
        loadingText="Refreshing…"
        icon={<RefreshCw aria-hidden="true" />}
        onClick={refresh}
      >
        Refresh public pages
      </LoadingButton>
      {state === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          The public pages weren&apos;t refreshed. Try again in a moment.
        </p>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {state === "done"
            ? "Done. The landing and About pages read the new content on their next visit."
            : "After a sync, so the landing and About pages show it now rather than within the hour."}
        </p>
      )}
    </div>
  );
}
