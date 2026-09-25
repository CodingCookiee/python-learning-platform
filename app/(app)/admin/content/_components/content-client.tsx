"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, BookOpen, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BeltBand } from "@/components/brand/belt";
import { beltForModule } from "@/lib/ranks";

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
  const [listError, setListError] = React.useState<string | null>(null);

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
        setError(data.error ?? "That module didn't save. Check the fields and try again.");
        return;
      }
      if (editingId) {
        setModules((prev) => prev.map((m) => (m.id === editingId ? { ...m, ...body } : m)));
      } else if (data.module) {
        setModules((prev) => [...prev, { ...data.module!, _count: { lessons: 0, projects: 0 } }]);
      }
      closeForm();
    } catch {
      setError("We couldn't reach the server. Nothing was saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setListError(null);
    try {
      const res = await fetch(`/api/admin/content/modules/${id}`, { method: "DELETE" });
      if (res.ok) setModules((prev) => prev.filter((m) => m.id !== id));
      else setListError("That module wasn't deleted. Refresh the page and try again.");
    } catch {
      setListError("We couldn't reach the server, so nothing was deleted.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Modules section */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Modules <span className="font-condensed tabular text-muted-foreground">{modules.length}</span>
        </h2>
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden="true" />
          Add module
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
                    <p className="text-lg font-semibold">
                      {editingId ? "Edit module" : "New module"}
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
                      <label htmlFor="mod-title" className="text-sm font-semibold">
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
                        <label htmlFor="mod-phase" className="text-sm font-semibold">
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
                        <label htmlFor="mod-duration" className="text-sm font-semibold">
                          Duration (hours)
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
                    <label htmlFor="mod-desc" className="text-sm font-semibold">
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

      {/* Module list: the syllabus as a ruled table */}
      {listError && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          {listError}
        </p>
      )}
      {modules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-12 text-center">
          <BookOpen className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No modules yet. Add the first one above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-sm text-muted-foreground">
                <th scope="col" className="w-12 py-2.5 pr-3 font-medium">
                  #
                </th>
                <th scope="col" className="py-2.5 pr-4 font-medium">
                  Module
                </th>
                <th scope="col" className="w-32 py-2.5 pr-4 font-medium">
                  Belt
                </th>
                <th scope="col" className="w-40 py-2.5 pr-4 font-medium">
                  Contents
                </th>
                <th scope="col" className="w-44 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => {
                const belt = beltForModule(mod.order);
                return (
                  <tr key={mod.id} className="border-b border-border align-top">
                    <td className="font-condensed tabular py-4 pr-3 text-lg font-bold text-muted-foreground">
                      {String(mod.order).padStart(2, "0")}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="flex flex-col gap-1">
                        <Link href={`/modules/${mod.id}`} className="font-semibold hover:underline">
                          {mod.title}
                        </Link>
                        <span className="line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                          {mod.description}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="flex flex-col gap-1.5">
                        <BeltBand belt={belt.key} className="h-3 w-20" />
                        <span className="text-sm">{belt.label}</span>
                      </span>
                    </td>
                    <td className="font-condensed tabular py-4 pr-4 text-sm">
                      {mod._count.lessons} {mod._count.lessons === 1 ? "lesson" : "lessons"}
                      <br />
                      {mod._count.projects} {mod._count.projects === 1 ? "project" : "projects"} · ~
                      {mod.duration} h
                    </td>
                    <td className="py-4">
                      <span className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(mod)}
                          aria-label={`Edit ${mod.title}`}
                        >
                          <Pencil aria-hidden="true" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={deletingId === mod.id}
                              aria-label={`Delete ${mod.title}`}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete “{mod.title}”?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This also deletes its {mod._count.lessons} lessons and{" "}
                                {mod._count.projects} capstone projects, and every learner’s
                                progress and submissions in them. It can’t be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep module</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  void handleDelete(mod.id);
                                }}
                                className="bg-destructive text-sheet hover:bg-destructive/90"
                              >
                                Delete module
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
