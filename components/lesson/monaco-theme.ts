import type { Monaco } from "@monaco-editor/react";

/**
 * pylearn themes for Monaco, converted from the OKLCH tokens in
 * app/globals.css (Monaco only accepts hex). Keep these in step with the
 * --code-* and surface tokens there.
 */
const PALETTE = {
  light: {
    bg: "#f9fdf9",
    fg: "#162c21",
    muted: "#455c4f",
    comment: "#5a6f63",
    border: "#cddace",
    line: "#eff6ef",
    primary: "#0f7c55",
    keyword: "#006647",
    string: "#71640b",
    number: "#9c522e",
    attr: "#305f85",
    error: "#ad4c3f",
    selection: "#b9e4c6",
  },
  dark: {
    bg: "#13231c",
    fg: "#e7f0e6",
    muted: "#a5bba9",
    comment: "#849987",
    border: "#2c4037",
    line: "#192b23",
    primary: "#78d59d",
    keyword: "#83daa9",
    string: "#ebd47d",
    number: "#f2b58c",
    attr: "#8ec5ec",
    error: "#ef9687",
    selection: "#224c37",
  },
} as const;

export const MONACO_THEME = { light: "pylearn-light", dark: "pylearn-dark" } as const;

let defined = false;

export function definePylearnThemes(monaco: Monaco) {
  if (defined) return;
  defined = true;
  for (const mode of ["light", "dark"] as const) {
    const p = PALETTE[mode];
    const strip = (hex: string) => hex.slice(1);
    monaco.editor.defineTheme(MONACO_THEME[mode], {
      base: mode === "dark" ? "vs-dark" : "vs",
      inherit: true,
      rules: [
        { token: "", foreground: strip(p.fg) },
        { token: "comment", foreground: strip(p.comment), fontStyle: "italic" },
        { token: "keyword", foreground: strip(p.keyword) },
        { token: "string", foreground: strip(p.string) },
        { token: "number", foreground: strip(p.number) },
        { token: "type", foreground: strip(p.attr) },
        { token: "identifier", foreground: strip(p.fg) },
        { token: "delimiter", foreground: strip(p.muted) },
        { token: "tag", foreground: strip(p.attr) },
      ],
      colors: {
        "editor.background": p.bg,
        "editor.foreground": p.fg,
        "editor.lineHighlightBackground": p.line,
        "editor.lineHighlightBorder": p.line,
        "editor.selectionBackground": p.selection,
        "editor.inactiveSelectionBackground": p.selection + "99",
        "editorCursor.foreground": p.primary,
        "editorLineNumber.foreground": p.comment,
        "editorLineNumber.activeForeground": p.fg,
        "editorIndentGuide.background1": p.border,
        "editorWhitespace.foreground": p.border,
        "editorError.foreground": p.error,
        "editorWidget.background": p.bg,
        "editorWidget.border": p.border,
        "editorSuggestWidget.background": p.bg,
        "editorSuggestWidget.border": p.border,
        "editorSuggestWidget.selectedBackground": p.line,
        "editorSuggestWidget.highlightForeground": p.primary,
        "scrollbarSlider.background": p.border + "99",
        "scrollbarSlider.hoverBackground": p.border,
        "focusBorder": p.primary,
      },
    });
  }
}
