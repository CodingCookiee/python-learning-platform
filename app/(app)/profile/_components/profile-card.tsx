"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LevelBadge } from "@/components/gamification/level-badge";
import { EditProfileForm } from "./edit-profile-form";
import { BookOpen, Trophy, CheckCircle2 } from "lucide-react";

interface ProfileCardProps {
  initials: string;
  name: string;
  email: string;
  level: number;
  achievements: number;
  lessonsCompleted: number;
  completionPercentage: number;
}

export function ProfileCard({
  initials,
  name,
  email,
  level,
  achievements,
  lessonsCompleted,
  completionPercentage,
}: ProfileCardProps) {
  const [displayName, setDisplayName] = useState(name);

  const handleNameSaved = (newName: string) => {
    setDisplayName(newName);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-8 sm:flex-row sm:items-start sm:gap-8">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold font-heading self-start">
          {initials}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold">{displayName}</h1>
            <LevelBadge level={level} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground">{email}</p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
              <Trophy className="size-3 text-yellow-500" aria-hidden="true" />
              {achievements} achievements
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
              <BookOpen className="size-3" aria-hidden="true" />
              {lessonsCompleted} lessons done
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="size-3 text-emerald-500" aria-hidden="true" />
              {completionPercentage}% complete
            </Badge>
          </div>
          <EditProfileForm initialName={displayName} onSaved={handleNameSaved} />
        </div>
      </CardContent>
    </Card>
  );
}
