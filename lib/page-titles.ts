import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

/**
 * Browser-tab titles for the pages whose subject comes from the database, so a learner with
 * five tabs open can tell the lesson from the drill. Each looks up one title; a missing row
 * falls back to a plain label (the page itself shows the not-found state).
 */

export async function lessonMetadata(id: string): Promise<Metadata> {
  const lesson = await prisma.lesson.findUnique({ where: { id }, select: { title: true, module: { select: { title: true } } } });
  return { title: lesson ? `${lesson.title} · ${lesson.module.title}` : "Lesson" };
}

export async function exerciseMetadata(id: string): Promise<Metadata> {
  const drill = await prisma.exercise.findUnique({ where: { id }, select: { title: true } });
  return { title: drill ? `${drill.title} (drill)` : "Drill" };
}

export async function moduleMetadata(id: string): Promise<Metadata> {
  const learningModule = await prisma.module.findUnique({ where: { id }, select: { title: true } });
  return { title: learningModule?.title ?? "Module" };
}

export async function projectMetadata(id: string, submitting = false): Promise<Metadata> {
  const project = await prisma.project.findUnique({ where: { id }, select: { title: true } });
  if (!project) return { title: "Capstone" };
  return { title: submitting ? `Submit ${project.title}` : `${project.title} (capstone)` };
}

/** A checkpoint page's id is the learner's attempt */
export async function checkpointMetadata(attemptId: string): Promise<Metadata> {
  const attempt = await prisma.checkpointAttempt.findUnique({
    where: { id: attemptId },
    select: { module: { select: { title: true } } },
  });
  return { title: attempt ? `Checkpoint: ${attempt.module.title}` : "Checkpoint" };
}
