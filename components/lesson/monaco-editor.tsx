"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { definePylearnThemes, MONACO_THEME } from "./monaco-theme";

let snippetsRegistered = false;
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
  /** When `value` came from a server-saved draft: a local copy only wins if it's newer */
  valueSavedAt?: string | null;
  onRun?: () => void;
  /** Monaco language id; a multi-file drill's data files pass their own (see languageFor) */
  language?: string;
  className?: string;
  /** Checkpoints: nothing pasted or dropped in, nothing copied or cut out (the answer is typed) */
  lockClipboard?: boolean;
  /** Told each time the lock stops a copy, cut, paste or drop, so the page can say why */
  onClipboardBlocked?: () => void;
  /** What screen readers call the editor ("Your code for Hello, pylearn") */
  ariaLabel?: string;
  /** Show the keys under the editor: run, indent, and how to leave it with the keyboard */
  keyLegend?: boolean;
}

const PHONE_QUERY = "(max-width: 767px)";
const subscribePhone = (onChange: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const subscribeNothing = () => () => {};

/** Clipboard events the lock stops before the editor sees them (it listens to the same ones) */
const CLIPBOARD_EVENTS = ["paste", "copy", "cut", "drop"] as const;
/** Text arriving by paste or drop, as the browser announces it before inserting */
const PASTED_INPUT = /^insertFrom(Paste|Drop)|^deleteByCut$/;

/** The Monaco language for a drill file's path. TOML has no built-in mode; ini is close. */
export function languageFor(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return { py: "python", toml: "ini", ini: "ini", cfg: "ini", json: "json", md: "markdown", yaml: "yaml", yml: "yaml" }[ext] ?? "plaintext";
}

export function PythonEditor({
  value,
  onChange,
  height = "300px",
  readOnly = false,
  storageKey,
  valueSavedAt,
  onRun,
  language = "python",
  className,
  lockClipboard = false,
  onClipboardBlocked,
  ariaLabel = "Python code editor",
  keyLegend = false,
}: PythonEditorProps) {
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "dark" ? MONACO_THEME.dark : MONACO_THEME.light;

  // A phone-sized screen: read from the media query after hydration (the server renders the wide
  // layout, so reading it during the first render made the phone's markup disagree with the server's)
  const isMobile = React.useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
  // The keys people press: Ctrl on Windows and Linux; on a Mac, Cmd to run and Ctrl+Shift+M for focus
  const isMac = React.useSyncExternalStore(subscribeNothing, () => /Mac|iPhone|iPad/.test(navigator.platform), () => false);

  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // The Ctrl+Enter action is registered once at mount; read the latest handler through a ref
  const onRunRef = React.useRef(onRun);
  const onBlockedRef = React.useRef(onClipboardBlocked);
  React.useEffect(() => {
    onRunRef.current = onRun;
    onBlockedRef.current = onClipboardBlocked;
  });

  // The clipboard lock, at the DOM: capture-phase listeners on the wrapper run before the editor's
  // own (on its hidden input inside), so a stopped paste, drop, copy or cut never reaches it. This
  // covers the keyboard, the browser's right-click menu, long-press on phones and drag and drop.
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!lockClipboard || !wrapper) return;
    const block = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      onBlockedRef.current?.();
    };
    const blockPastedInput = (event: Event) => {
      if (PASTED_INPUT.test((event as InputEvent).inputType)) block(event);
    };
    for (const type of CLIPBOARD_EVENTS) wrapper.addEventListener(type, block, true);
    wrapper.addEventListener("beforeinput", blockPastedInput, true);
    return () => {
      for (const type of CLIPBOARD_EVENTS) wrapper.removeEventListener(type, block, true);
      wrapper.removeEventListener("beforeinput", blockPastedInput, true);
    };
  }, [lockClipboard]);
  const lockRef = React.useRef(lockClipboard);
  React.useEffect(() => {
    lockRef.current = lockClipboard;
  }, [lockClipboard]);

  const [initialValue] = React.useState<string>(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        const savedAt = Number(localStorage.getItem(`${storageKey}:t`) ?? 0);
        const serverAt = valueSavedAt ? new Date(valueSavedAt).getTime() : 0;
        if (saved !== null && savedAt >= serverAt) return saved;
      } catch {
        // Storage can be unavailable (private mode); the server draft or starter stands
      }
    }
    return value;
  });

  // Until mount has handed any saved code to the parent, show the saved code;
  // afterwards the parent's value is the source of truth (so Reset works)
  const [synced, setSynced] = React.useState(false);

  function handleChange(newValue: string | undefined) {
    const val = newValue ?? "";
    onChange(val);
    if (storageKey) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, val);
          localStorage.setItem(`${storageKey}:t`, String(Date.now()));
        } catch {
          // Out of space or blocked: the server autosave still has it
        }
      }, 500);
    }
  }

  function handleMount(editor: EditorInstance, monaco: Monaco) {
    // Code restored from localStorage is what's on screen, so it's what the parent must run
    if (initialValue !== value) onChange(initialValue);
    setSynced(true);

    // The clipboard lock's backstop: Monaco's own Paste command (its command palette) reads the
    // clipboard directly and inserts the text without a paste event, so take that text back out
    editor.onDidPaste((event) => {
      if (!lockRef.current) return;
      editor.executeEdits("clipboard-lock", [{ range: event.range, text: "" }]);
      onBlockedRef.current?.();
    });

    // Keyboard shortcut to run code
    if (onRun) {
      editor.addAction({
        id: "run-code",
        label: "Run Code",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => onRunRef.current?.(),
      });
    }

    // Register the snippet provider once per page, not once per editor
    if (snippetsRegistered) return;
    snippetsRegistered = true;
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
    <div ref={wrapperRef} className={cn("flex flex-col gap-0", className)}>
      {/* Mobile hint for complex exercises */}
      {isMobile && !readOnly && (
        <div className="flex items-center gap-2 rounded-t-md border-x border-t border-border bg-accent/50 px-3 py-1.5">
          <Monitor className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            Longer drills are easier with a keyboard. A laptop works best.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border">
        <MonacoEditor
          height={editorHeight}
          defaultLanguage={language}
          value={synced ? value : initialValue}
          theme={monacoTheme}
          onChange={handleChange}
          beforeMount={definePylearnThemes}
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
            fontSize: isMobile ? 13 : 14,
            lineHeight: 24,
            fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
            fontLigatures: false,
            lineNumbers: isMobile ? "off" : "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "line",
            tabSize: 4,
            insertSpaces: true,
            readOnly,
            ariaLabel,
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
            // Locked: no Cut/Copy/Paste menu, and no dropping or paste-as from Monaco itself
            ...(lockClipboard && {
              contextmenu: false,
              dropIntoEditor: { enabled: false },
              pasteAs: { enabled: false },
            }),
          }}
        />
      </div>
      {keyLegend && !readOnly && !isMobile && (
        // Tab indents inside the editor, so leaving it by keyboard needs a key worth showing
        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {onRun && (
            <span>
              <kbd className="font-mono">{isMac ? "⌘" : "Ctrl"}+Enter</kbd> runs the tests
            </span>
          )}
          <span>
            <kbd className="font-mono">Tab</kbd> indents
          </span>
          <span>
            <kbd className="font-mono">{isMac ? "⌃⇧M" : "Ctrl+M"}</kbd> then <kbd className="font-mono">Tab</kbd> leaves the editor
          </span>
        </p>
      )}
    </div>
  );
}
