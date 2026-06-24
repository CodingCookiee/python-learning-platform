"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, GitBranch, CheckCircle2, AlertCircle, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".py", ".md", ".txt", ".zip", ".json", ".toml", ".cfg", ".ini"];
const GITHUB_REGEX = /^https?:\/\/(www\.)?github\.com\/.+\/.+/i;

interface FileItem {
  name: string;
  size: number;
  type: string;
  content: string;
}

interface SubmitResponse {
  success: boolean;
  submissionId?: string;
  error?: string;
}

export interface ProjectSubmitClientProps {
  projectId: string;
  projectTitle: string;
}

export function ProjectSubmitClient({ projectId, projectTitle }: ProjectSubmitClientProps) {
  const router = useRouter();

  const [tab, setTab] = React.useState<"files" | "github">("files");
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [githubUrl, setGithubUrl] = React.useState("");
  const [githubError, setGithubError] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  // suppress unused warning for projectTitle (used for aria)
  const _title = projectTitle;

  async function fileToItem(file: File): Promise<FileItem> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      content: btoa(binary),
    };
  }

  async function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setIsProcessingFiles(true);
    try {
      const incomingItems = await Promise.all(Array.from(incoming).map((file) => fileToItem(file)));

      setFiles((prev) => {
        const names = new Set(prev.map((f) => f.name));
        return [...prev, ...incomingItems.filter((file) => !names.has(file.name))];
      });
    } finally {
      setIsProcessingFiles(false);
    }
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    void addFiles(e.dataTransfer.files);
  }

  function validateGithubUrl(url: string): string {
    if (!url.trim()) return "GitHub URL is required";
    if (!GITHUB_REGEX.test(url)) return "Must be a valid github.com repository URL";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (isProcessingFiles) {
      setSubmitError("Please wait for the files to finish loading.");
      return;
    }

    if (tab === "github") {
      const err = validateGithubUrl(githubUrl);
      if (err) {
        setGithubError(err);
        return;
      }
    } else {
      if (files.length === 0) {
        setSubmitError("Please add at least one file.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const body =
        tab === "github"
          ? { type: "github", githubUrl: githubUrl.trim(), notes: notes.trim() || undefined }
          : { type: "files", files, notes: notes.trim() || undefined };

      const res = await fetch(`/api/projects/${projectId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as SubmitResponse;
      if (!res.ok) {
        setSubmitError(data.error ?? "Submission failed.");
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  void _title;

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5, times: [0, 0.6, 1] }}
              className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10"
            >
              <CheckCircle2 className="size-8 text-emerald-500" aria-hidden="true" />
            </motion.div>
            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-xl font-semibold">Submission Received!</h2>
              <p className="text-sm text-muted-foreground">
                Your project has been submitted for review.
              </p>
            </div>
            <Button onClick={() => router.push(`/projects/${projectId}`)}>Back to Project</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "files" | "github")}>
        <TabsList className="w-full">
          <TabsTrigger value="files" className="flex flex-1 items-center gap-2">
            <Upload className="size-3.5" aria-hidden="true" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="github" className="flex flex-1 items-center gap-2">
            <GitBranch className="size-3.5" aria-hidden="true" />
            GitHub Repository
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Click or drag and drop files to upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            className={cn(
              "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">{ACCEPTED_EXTENSIONS.join(", ")}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="sr-only"
              onChange={(e) => void addFiles(e.target.files)}
              aria-hidden="true"
            />
          </div>

          <AnimatePresence>
            {files.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex flex-col gap-2 overflow-hidden"
                role="list"
              >
                {files.map((file) => (
                  <motion.li
                    key={file.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="flex items-center gap-3 rounded-sm border border-border bg-card px-3 py-2"
                  >
                    <FileText
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.name);
                      }}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="github" className="mt-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="github-url" className="text-sm font-medium">
              Repository URL
            </label>
            <Input
              id="github-url"
              type="url"
              placeholder="https://github.com/username/repository"
              value={githubUrl}
              onChange={(e) => {
                setGithubUrl(e.target.value);
                setGithubError("");
              }}
              aria-describedby={githubError ? "github-url-error" : undefined}
              aria-invalid={!!githubError}
            />
            {githubError && (
              <p
                id="github-url-error"
                className="flex items-center gap-1.5 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {githubError}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          id="notes"
          placeholder="Any notes for the reviewer…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={4}
        />
        <p className="text-xs text-muted-foreground text-right">{notes.length}/2000</p>
      </div>

      <AnimatePresence>
        {submitError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {submitError}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/projects/${projectId}`)}
          disabled={isSubmitting || isProcessingFiles}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isProcessingFiles}>
          {isSubmitting
            ? "Submitting\u2026"
            : isProcessingFiles
              ? "Preparing files\u2026"
              : "Submit Project"}
        </Button>
      </div>
    </form>
  );
}
