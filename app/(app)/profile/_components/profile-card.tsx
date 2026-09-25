"use client";

import { useState } from "react";
import { LevelBadge } from "@/components/gamification/level-badge";
import { EditProfileForm } from "./edit-profile-form";

interface ProfileCardProps {
  initials: string;
  name: string;
  email: string;
  level: number;
}

/** Identity row: initials tile, name, email, level, and an inline name editor */
export function ProfileCard({ initials, name, email, level }: ProfileCardProps) {
  const [displayName, setDisplayName] = useState(name);

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div
        className="font-condensed flex size-20 shrink-0 items-center justify-center rounded-md border border-border bg-accent text-3xl font-extrabold"
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-condensed text-4xl leading-none font-extrabold tracking-[-0.02em] sm:text-5xl">
            {displayName}
          </h1>
          <LevelBadge level={level} size="sm" />
        </div>
        <p className="truncate text-muted-foreground">{email}</p>
      </div>
      <EditProfileForm initialName={displayName} onSaved={setDisplayName} />
    </header>
  );
}
