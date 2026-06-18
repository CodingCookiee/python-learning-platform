"use client";

import * as React from "react";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { ModuleProgressCard } from "@/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getCurriculumPhaseKey, getCurriculumPhases } from "@/lib/curriculum";

export interface ModuleData {
  id: string;
  title: string;
  description: string;
  phase: string;
  order: number;
  duration: number;
  lessonCount: number;
  projectCount: number;
  completionPercentage: number;
  isUnlocked: boolean;
  prerequisites: Array<{ id: string; title: string; order: number }>;
  lessons: Array<{ id: string; title: string; order: number }>;
  projects: Array<{ id: string; title: string }>;
}

type PhaseFilter = "all" | "foundation" | "intermediate" | "advanced" | "applied";
type StatusFilter = "all" | "not-started" | "in-progress" | "completed" | "locked";
type SortOption = "default" | "az" | "za" | "most-complete" | "least-complete";

function getStatus(module: ModuleData): StatusFilter {
  if (!module.isUnlocked) return "locked";
  if (module.completionPercentage >= 100) return "completed";
  if (module.completionPercentage > 0) return "in-progress";
  return "not-started";
}

interface ModulesClientProps {
  modules: ModuleData[];
}

export function ModulesClient({ modules }: ModulesClientProps) {
  const [phaseFilter, setPhaseFilter] = React.useState<PhaseFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sortOption, setSortOption] = React.useState<SortOption>("default");
  const curriculumPhases = React.useMemo(() => getCurriculumPhases(), []);

  const filtered = React.useMemo(() => {
    let result = modules.filter((m) => {
      const phaseKey = getCurriculumPhaseKey(m.phase);
      if (phaseFilter !== "all" && phaseKey !== phaseFilter) return false;
      if (statusFilter !== "all" && getStatus(m) !== statusFilter) return false;
      return true;
    });

    if (sortOption === "az") {
      result = [...result].sort((a, b) => {
        const al = !a.isUnlocked ? 1 : 0;
        const bl = !b.isUnlocked ? 1 : 0;
        if (al !== bl) return al - bl;
        return a.title.localeCompare(b.title);
      });
    } else if (sortOption === "za") {
      result = [...result].sort((a, b) => {
        const al = !a.isUnlocked ? 1 : 0;
        const bl = !b.isUnlocked ? 1 : 0;
        if (al !== bl) return al - bl;
        return b.title.localeCompare(a.title);
      });
    } else if (sortOption === "most-complete") {
      result = [...result].sort((a, b) => {
        const al = !a.isUnlocked ? 1 : 0;
        const bl = !b.isUnlocked ? 1 : 0;
        if (al !== bl) return al - bl;
        return b.completionPercentage - a.completionPercentage;
      });
    } else if (sortOption === "least-complete") {
      result = [...result].sort((a, b) => {
        const al = !a.isUnlocked ? 1 : 0;
        const bl = !b.isUnlocked ? 1 : 0;
        if (al !== bl) return al - bl;
        return a.completionPercentage - b.completionPercentage;
      });
    } else {
      result = [...result].sort((a, b) => {
        const al = !a.isUnlocked ? 1 : 0;
        const bl = !b.isUnlocked ? 1 : 0;
        if (al !== bl) return al - bl;
        return a.order - b.order;
      });
    }
    return result;
  }, [modules, phaseFilter, statusFilter, sortOption]);

  function clearFilters() {
    setPhaseFilter("all");
    setStatusFilter("all");
    setSortOption("default");
  }

  const hasActiveFilters =
    phaseFilter !== "all" || statusFilter !== "all" || sortOption !== "default";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={phaseFilter} onValueChange={(v) => setPhaseFilter(v as PhaseFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Phases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {curriculumPhases.map((phase) => (
              <SelectItem key={phase.key} value={phase.key}>
                {phase.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="not-started">Not Started</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Default Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default Order</SelectItem>
            <SelectItem value="az">A to Z</SelectItem>
            <SelectItem value="za">Z to A</SelectItem>
            <SelectItem value="most-complete">Most Complete</SelectItem>
            <SelectItem value="least-complete">Least Complete</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {modules.length} modules
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">No modules match your filters.</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((module, index) => {
            const lessonsCompleted = Math.round(
              (module.completionPercentage * module.lessonCount) / 100
            );
            return (
              <FadeIn key={module.id} delay={index * 0.04}>
                <ModuleProgressCard
                  moduleId={module.id}
                  title={module.title}
                  phase={module.phase}
                  completionPercentage={module.completionPercentage}
                  lessonsCompleted={lessonsCompleted}
                  lessonsTotal={module.lessonCount}
                  projectsTotal={module.projectCount}
                  isLocked={!module.isUnlocked}
                  prerequisiteNames={module.prerequisites.map((p) => p.title)}
                />
              </FadeIn>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
