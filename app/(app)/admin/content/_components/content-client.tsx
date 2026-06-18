"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, BookOpen, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurriculumPhaseLabel } from "@/lib/curriculum";

interface Module {
  id: string;
  title: string;
  description: string;
  phase: string;
  duration: number;
  order: number;
  _count: { lessons: number; projects: number };
}

interface ContentClientProps {
  initialModules: Module[];
}

interface ModuleFormData {
  title: string;
  description: string;
  phase: string;
  duration: string;
}

const emptyForm: ModuleFormData = { title: "", description: "", phase: "1", duration: "10" };

export function ContentClient({ initialModules }: ContentClientProps) {
  const [modules, setModules] = React.useState<Module[]>(initialModules);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ModuleFormData>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(mod: Module) {
    setEditingId(mod.id);
    setForm({
      title: mod.title,
      description: mod.description,
      phase: mod.phase,
      duration: String(mod.duration),
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        phase: form.phase,
        duration: parseInt(form.duration) || 10,
      };
      const url = editingId
        ? `/api/admin/content/modules/${editingId}`
        : "/api/admin/content/modules";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { module?: Module; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }
      if (editingId) {
        setModules((prev) => prev.map((m) => (m.id === editingId ? { ...m, ...body } : m)));
      } else if (data.module) {
        setModules((prev) => [...prev, { ...data.module!, _count: { lessons: 0, projects: 0 } }]);
      }
      closeForm();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/content/modules/${id}`, { method: "DELETE" });
      if (res.ok) setModules((prev) => prev.filter((m) => m.id !== id));
    } catch {
      /* silent */
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Modules section */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Modules ({modules.length})
        </h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add Module
        </Button>
      </div>

      {/* Create / Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-primary/30">
              <CardContent className="pt-5">
                <form
                  onSubmit={(e) => {
                    void handleSave(e);
                  }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-heading text-sm font-semibold">
                      {editingId ? "Edit Module" : "New Module"}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={closeForm}
                      aria-label="Close"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="mod-title" className="text-xs font-medium">
                        Title
                      </label>
                      <Input
                        id="mod-title"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        maxLength={200}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="mod-phase" className="text-xs font-medium">
                          Phase
                        </label>
                        <Input
                          id="mod-phase"
                          value={form.phase}
                          onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value }))}
                          maxLength={20}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="mod-duration" className="text-xs font-medium">
                          Duration (hrs)
                        </label>
                        <Input
                          id="mod-duration"
                          type="number"
                          min={1}
                          value={form.duration}
                          onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="mod-desc" className="text-xs font-medium">
                      Description
                    </label>
                    <Textarea
                      id="mod-desc"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      required
                    />
                  </div>
                  {error && (
                    <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      {error}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving}>
                      <Check className="size-3.5" aria-hidden="true" />
                      {saving ? "Saving\u2026" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={closeForm}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module list */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No modules yet. Add one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {modules.map((mod) => (
            <Card key={mod.id}>
              <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                      #{mod.order}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {getCurriculumPhaseLabel(mod.phase)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {mod.duration}h
                    </Badge>
                  </div>
                  <p className="font-heading text-sm font-semibold">{mod.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{mod.description}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <Link
                      href={`/modules/${mod.id}`}
                      className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
                    >
                      {mod._count.lessons} lessons
                    </Link>
                    <span>{mod._count.projects} projects</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(mod)}
                    aria-label={`Edit ${mod.title}`}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void handleDelete(mod.id);
                    }}
                    disabled={deletingId === mod.id}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    aria-label={`Delete ${mod.title}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    {deletingId === mod.id ? "Deleting\u2026" : "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
