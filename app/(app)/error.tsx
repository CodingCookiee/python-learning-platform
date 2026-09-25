"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/brand/status-page";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="500"
      title="Something slipped on the mat."
      message="This page hit an error while loading. Your progress is saved. Try again, and if it keeps happening, head back to the dashboard."
      actions={[
        { label: "Try again", onClick: reset },
        { label: "Back to the dashboard", href: "/dashboard", variant: "outline" },
      ]}
    />
  );
}
