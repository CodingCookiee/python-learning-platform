"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

interface EditProfileFormProps {
  initialName: string;
  onSaved: (newName: string) => void;
}

export function EditProfileForm({ initialName, onSaved }: EditProfileFormProps) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(initialName);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        setError("Failed to save");
        return;
      }
      onSaved(trimmed);
      setEditing(false);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)} aria-label="Edit name">
        <Pencil className="size-3.5" aria-hidden="true" />
        Edit Profile
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            maxLength={80}
            aria-label="Display name"
            className="h-8 max-w-xs text-sm"
          />
          <Button size="sm" onClick={() => void handleSave()} disabled={saving} aria-label="Save">
            <Check className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(false);
              setName(initialName);
            }}
            aria-label="Cancel"
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
