"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, BookOpen, Layers, Code2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LockedMark } from "@/components/brand/marks";

interface SearchResult {
  id: string;
  type: "module" | "lesson" | "exercise";
  title: string;
  description: string;
  href: string;
  moduleTitle?: string;
  isLocked?: boolean;
  lockLabel?: string;
}

const TYPE_ICONS = {
  module: Layers,
  lesson: BookOpen,
  exercise: Code2,
} as const;

const TYPE_LABELS = {
  module: "Module",
  lesson: "Lesson",
  exercise: "Exercise",
} as const;

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[2px] bg-accent font-semibold text-foreground">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchBar() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIdx, setSelectedIdx] = React.useState(-1);
  // Show the shortcut the learner will actually press (Ctrl on Windows/Linux)
  const modKey = React.useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"),
    () => "Ctrl"
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsId = React.useId();
  const router = useRouter();

  const closeSearch = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setLoading(false);
    setSelectedIdx(-1);
  }, []);

  const clearSearch = React.useCallback(() => {
    setQuery("");
    setResults([]);
    setLoading(false);
    setSelectedIdx(-1);
    inputRef.current?.focus();
  }, []);

  // Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") closeSearch();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeSearch]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { results: SearchResult[] };
          setResults(data.results);
          setSelectedIdx(-1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const visibleResults = query.length >= 2 ? results : [];

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      const r = results[selectedIdx];
      if (r) navigate(r.href);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 items-center gap-2 rounded-sm border border-border bg-sheet px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground md:flex"
        aria-label={`Search (${modKey === "⌘" ? "Cmd" : "Ctrl"}+K)`}
      >
        <Search className="size-3.5" aria-hidden="true" />
        <span>Search</span>
        <kbd className="ml-3 hidden h-5 items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 font-sans text-xs text-muted-foreground sm:inline-flex">
          <span>{modKey}</span>
          <span>K</span>
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Search"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-start justify-center bg-foreground/35 px-4 pt-[10vh]"
            onClick={closeSearch}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl overflow-hidden rounded-md border border-border bg-sheet shadow-overlay"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Search"
              aria-modal="true"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                {loading && query.length >= 2 ? (
                  <Loader2
                    className="size-4 shrink-0 text-muted-foreground animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    const nextQuery = e.target.value;
                    setQuery(nextQuery);
                    if (nextQuery.length < 2) {
                      setLoading(false);
                      setSelectedIdx(-1);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search the syllabus: modules, lessons, drills"
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                  aria-label="Search query"
                  role="combobox"
                  aria-controls={resultsId}
                  aria-expanded={visibleResults.length > 0}
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                />
                {query && (
                  <button
                    onClick={clearSearch}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
                <kbd className="hidden h-5 shrink-0 items-center rounded-[3px] border border-border bg-background px-1.5 font-sans text-xs text-muted-foreground sm:flex">
                  esc
                </kbd>
              </div>

              {/* Results */}
              {visibleResults.length > 0 && (
                <div
                  id={resultsId}
                  className="max-h-[60vh] overflow-y-auto border-t border-border"
                  role="listbox"
                >
                  {visibleResults.map((r, i) => {
                    const Icon = TYPE_ICONS[r.type];
                    return (
                      <button
                        key={r.id}
                        role="option"
                        aria-selected={i === selectedIdx}
                        onClick={() => navigate(r.href)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                          i === selectedIdx ? "bg-accent" : "hover:bg-accent/50",
                          i > 0 && "border-t border-border"
                        )}
                      >
                        <Icon
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {TYPE_LABELS[r.type]}
                            </span>
                            {r.isLocked && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                <LockedMark className="size-3.5" />
                                Locked
                              </span>
                            )}
                            {r.moduleTitle && (
                              <span className="text-xs text-muted-foreground truncate">
                                · {r.moduleTitle}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-sm font-medium">
                            {highlight(r.title, query)}
                          </p>
                          {r.isLocked && r.lockLabel && (
                            <p className="truncate text-xs text-muted-foreground">{r.lockLabel}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {query.length >= 2 && !loading && visibleResults.length === 0 && (
                <div className="border-t border-border px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nothing in the syllabus matches &ldquo;{query}&rdquo;. Try a topic like
                    &ldquo;decorators&rdquo; or &ldquo;async&rdquo;.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
