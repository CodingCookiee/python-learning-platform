"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Monitor } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
});

type EditorInstance = Parameters<
  NonNullable<React.ComponentProps<typeof MonacoEditor>["onMount"]>
>[0];
type Monaco = Parameters<NonNullable<React.ComponentProps<typeof MonacoEditor>["onMount"]>>[1];

const PYTHON_SNIPPETS = [
  {
    label: "def",
    insertText: "def ${1:function_name}(${2:args}):\n    ${3:pass}",
    doc: "Define a function",
  },
  {
    label: "class",
    insertText: "class ${1:ClassName}:\n    def __init__(self):\n        ${2:pass}",
    doc: "Define a class",
  },
  { label: "for", insertText: "for ${1:item} in ${2:iterable}:\n    ${3:pass}", doc: "For loop" },
  { label: "while", insertText: "while ${1:condition}:\n    ${2:pass}", doc: "While loop" },
  { label: "if", insertText: "if ${1:condition}:\n    ${2:pass}", doc: "If statement" },
  {
    label: "try",
    insertText: "try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    ${3:pass}",
    doc: "Try/except",
  },
  {
    label: "with",
    insertText: "with ${1:open('file')} as ${2:f}:\n    ${3:pass}",
    doc: "Context manager",
  },
  {
    label: "list",
    insertText: "[${1:item} for ${1:item} in ${2:iterable}]",
    doc: "List comprehension",
  },
  {
    label: "dict",
    insertText: "{${1:key}: ${2:value} for ${1:key}, ${2:value} in ${3:items}}",
    doc: "Dict comprehension",
  },
  { label: "print", insertText: "print(${1:value})", doc: "Print statement" },
  { label: "import", insertText: "import ${1:module}", doc: "Import module" },
  { label: "return", insertText: "return ${1:value}", doc: "Return statement" },
  { label: "lambda", insertText: "lambda ${1:x}: ${2:x}", doc: "Lambda function" },
];

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

  // Lazy init avoids calling setState synchronously inside an effect
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    // Only subscribe to changes -- initial value set in lazy useState above
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
    // Keyboard shortcut to run code
    if (onRun) {
      editor.addAction({
        id: "run-code",
        label: "Run Code",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => onRun(),
      });
    }

    // Register Python snippet completion provider
    monaco.languages.registerCompletionItemProvider("python", {
      provideCompletionItems: (
        model: import("monaco-editor").editor.ITextModel,
        position: import("monaco-editor").Position
      ) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions = PYTHON_SNIPPETS.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: s.doc,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));
        return { suggestions };
      },
    });
  }

  // Mobile: slightly shorter height so content fits without scrolling
  const editorHeight = isMobile ? "260px" : height;

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {/* Mobile hint for complex exercises */}
      {isMobile && !readOnly && (
        <div className="flex items-center gap-2 border-x border-t border-border bg-muted/50 px-3 py-1.5">
          <Monitor className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            For the best experience, try this on desktop.
          </p>
        </div>
      )}

      <div className="border border-border overflow-hidden">
        <MonacoEditor
          height={editorHeight}
          defaultLanguage="python"
          value={initialValue}
          theme={monacoTheme}
          onChange={handleChange}
          onMount={handleMount}
          loading={
            <div
              className="animate-pulse bg-muted"
              style={{ height: editorHeight }}
              aria-label="Loading editor"
            />
          }
          options={{
            minimap: { enabled: false },
            fontSize: isMobile ? 12 : 13,
            fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
            lineNumbers: isMobile ? "off" : "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "line",
            tabSize: 4,
            insertSpaces: true,
            readOnly,
            // Mobile: reduce UI chrome
            folding: !isMobile,
            lineDecorationsWidth: isMobile ? 0 : 10,
            overviewRulerBorder: !isMobile,
            hideCursorInOverviewRuler: isMobile,
            scrollbar: {
              verticalScrollbarSize: isMobile ? 6 : 10,
              horizontalScrollbarSize: isMobile ? 6 : 10,
            },
            wordWrap: isMobile ? "on" : "off",
            quickSuggestions: !isMobile,
            suggestOnTriggerCharacters: !isMobile,
          }}
        />
      </div>
    </div>
  );
}
