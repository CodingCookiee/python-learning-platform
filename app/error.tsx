"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/brand/status-page";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <StatusPage
        code="500"
        title="Something slipped on the mat."
        message="This page hit an error while loading. Try again in a moment."
        actions={[
          { label: "Try again", onClick: reset },
          { label: "Go to the home page", href: "/", variant: "outline" },
        ]}
      />
    </main>
  );
}
