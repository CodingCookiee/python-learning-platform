"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
});

type EditorInstance = Parameters<
  NonNullable<React.ComponentProps<typeof MonacoEditor>["onMount"]>
>[0];

type Monaco = Parameters<NonNullable<React.ComponentProps<typeof MonacoEditor>["onMount"]>>[1];

export interface PythonEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  storageKey?: string;
  onRun?: () => void;
  className?: string;
}

export function PythonEditor({
  value,
  onChange,
  height = "300px",
  readOnly = false,
  storageKey,
  onRun,
  className,
}: PythonEditorProps) {
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "dark" ? "vs-dark" : "vs";

  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [initialValue] = React.useState<string>(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return saved;
    }
    return value;
  });

  function handleChange(newValue: string | undefined) {
    const val = newValue ?? "";
    onChange(val);
    if (storageKey) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        localStorage.setItem(storageKey, val);
      }, 500);
    }
  }

  function handleMount(editor: EditorInstance, monaco: Monaco) {
    if (onRun) {
      editor.addAction({
        id: "run-code",
        label: "Run Code",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => onRun(),
      });
    }
  }

  return (
    <div className={cn("border border-border overflow-hidden", className)}>
      <MonacoEditor
        height={height}
        defaultLanguage="python"
        value={initialValue}
        theme={monacoTheme}
        onChange={handleChange}
        onMount={handleMount}
        loading={
          <div className="animate-pulse bg-muted" style={{ height }} aria-label="Loading editor" />
        }
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: "line",
          tabSize: 4,
          insertSpaces: true,
          readOnly,
        }}
      />
    </div>
  );
}
