"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, BookOpen, Layers, Code2, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <mark className="bg-primary/20 text-foreground not-italic">
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
        className="hidden md:flex items-center gap-2 h-9 px-3 text-xs text-muted-foreground border border-border bg-muted/30 hover:bg-muted transition-colors rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Search (Cmd+K)"
      >
        <Search className="size-3.5" aria-hidden="true" />
        <span>Search</span>
        <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[0.6rem] font-medium text-muted-foreground">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex md:hidden items-center justify-center size-9 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] px-4 bg-black/50 backdrop-blur-sm"
            onClick={closeSearch}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Search"
              aria-modal="true"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border border-border bg-background px-4 py-3 shadow-xl">
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
                  placeholder="Search modules, lessons, exercises…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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
                <kbd className="hidden sm:flex h-5 shrink-0 items-center rounded border border-border bg-muted px-1.5 font-mono text-[0.6rem] text-muted-foreground">
                  esc
                </kbd>
              </div>

              {/* Results */}
              {visibleResults.length > 0 && (
                <div
                  id={resultsId}
                  className="mt-1 border border-border bg-background shadow-xl overflow-hidden"
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
                          i === selectedIdx ? "bg-primary/5" : "hover:bg-muted/50",
                          i > 0 && "border-t border-border"
                        )}
                      >
                        <Icon
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                              {TYPE_LABELS[r.type]}
                            </span>
                            {r.isLocked && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                <Lock className="size-3" aria-hidden="true" />
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
                <div className="mt-1 border border-border bg-background px-4 py-6 text-center shadow-xl">
                  <p className="text-sm text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
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
