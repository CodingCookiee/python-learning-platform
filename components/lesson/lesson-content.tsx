"use client";

import { isValidElement, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/lesson/code-block";

// Helpers

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Plain text of a React node tree (highlighted code is nested spans) */
function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function extractTocItems(markdown: string): TocItem[] {
  // Ignore headings inside fenced code blocks
  const withoutCode = markdown.replace(/(```|~~~)[\s\S]*?\1/g, "");
  const regex = /^(#{2,3})\s+(.+)/gm;
  const items: TocItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(withoutCode)) !== null) {
    const level = match[1]!.length as 2 | 3;
    const text = match[2]!.replace(/`/g, "").trim();
    items.push({ level, text, slug: slugify(text) });
  }
  return items;
}

// Types

interface TocItem {
  level: 2 | 3;
  text: string;
  slug: string;
}

export interface LessonContentProps {
  content: string;
  className?: string;
}

function TocList({ items, activeSlug }: { items: TocItem[]; activeSlug: string | null }) {
  return (
    <ul className="flex flex-col gap-1.5 border-l border-border">
      {items.map((item) => (
        <li key={item.slug}>
          <a
            href={`#${item.slug}`}
            className={cn(
              "-ml-px block border-l-2 py-0.5 text-sm leading-snug transition-colors hover:text-foreground",
              item.level === 3 ? "pl-6" : "pl-3",
              activeSlug === item.slug
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground"
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

// Headings carry ids for the table of contents

function H1({ children, ...props }: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      id={slugify(nodeText(children))}
      className="mt-12 mb-4 scroll-mt-24 text-3xl leading-tight font-semibold tracking-[-0.015em]"
      {...props}
    >
      {children}
    </h2>
  );
}

function H2({ children, ...props }: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      id={slugify(nodeText(children))}
      className="mt-12 mb-4 scroll-mt-24 text-2xl leading-tight font-semibold tracking-[-0.01em]"
      {...props}
    >
      {children}
    </h2>
  );
}

function H3({ children, ...props }: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3 id={slugify(nodeText(children))} className="mt-8 mb-3 scroll-mt-24 text-lg font-semibold" {...props}>
      {children}
    </h3>
  );
}

// Defined once at module level: a new object per render would give React a
// new component type for every code block and remount them, wiping their output.
const components: Components = {
  pre({ children }: ComponentPropsWithoutRef<"pre">) {
    const child = isValidElement<{ className?: string; children?: ReactNode }>(children)
      ? children
      : null;
    const language = /language-(\w+)/.exec(child?.props.className ?? "")?.[1] ?? "";
    const code = nodeText(child?.props.children).replace(/\n$/, "");
    return (
      <CodeBlock code={code} language={language}>
        {children}
      </CodeBlock>
    );
  },

  code({ children, className: codeClassName, ...props }: ComponentPropsWithoutRef<"code">) {
    if (/language-/.test(codeClassName ?? "")) {
      return (
        <code className={cn(codeClassName, "hljs")} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-[3px] bg-accent/70 px-1.5 py-0.5 font-mono text-[0.875em] text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },

  // The page supplies the lesson title as <h1>; a markdown h1 is demoted
  h1: H1,
  h2: H2,
  h3: H3,

  blockquote({ children, ...props }: ComponentPropsWithoutRef<"blockquote">) {
    return (
      <blockquote
        className="my-6 rounded-md bg-accent/50 px-5 py-4 text-foreground [&>p:last-child]:mb-0"
        {...props}
      >
        {children}
      </blockquote>
    );
  },

  table({ children, ...props }: ComponentPropsWithoutRef<"table">) {
    return (
      <div className="my-6 overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm" {...props}>
          {children}
        </table>
      </div>
    );
  },
  th({ children, ...props }: ComponentPropsWithoutRef<"th">) {
    return (
      <th className="border-b border-border bg-sheet px-3 py-2 text-left font-semibold" {...props}>
        {children}
      </th>
    );
  },
  td({ children, ...props }: ComponentPropsWithoutRef<"td">) {
    return (
      <td className="border-b border-border/70 px-3 py-2 align-top" {...props}>
        {children}
      </td>
    );
  },

  a({ children, href, ...props }: ComponentPropsWithoutRef<"a">) {
    const external = href?.startsWith("http");
    return (
      <a
        href={href}
        className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },

  p({ children, ...props }: ComponentPropsWithoutRef<"p">) {
    return (
      <p className="mb-5 text-[1.0625rem] leading-[1.75] text-foreground" {...props}>
        {children}
      </p>
    );
  },
  ul({ children, ...props }: ComponentPropsWithoutRef<"ul">) {
    return (
      <ul className="mb-5 flex list-disc flex-col gap-1.5 pl-6 marker:text-primary" {...props}>
        {children}
      </ul>
    );
  },
  ol({ children, ...props }: ComponentPropsWithoutRef<"ol">) {
    return (
      <ol
        className="mb-5 flex list-decimal flex-col gap-1.5 pl-6 marker:font-semibold marker:text-muted-foreground"
        {...props}
      >
        {children}
      </ol>
    );
  },
  li({ children, ...props }: ComponentPropsWithoutRef<"li">) {
    return (
      <li className="pl-1 text-[1.0625rem] leading-[1.7] text-foreground" {...props}>
        {children}
      </li>
    );
  },
  hr() {
    return <hr className="my-10 border-border" />;
  },
};

// LessonContent

export function LessonContent({ content, className }: LessonContentProps) {
  // The page renders the lesson title; drop a leading markdown h1 that repeats it
  content = content.replace(/^\s*#\s+[^\n]*\n+/, "");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tocItems = extractTocItems(content);
  const hasToc = tocItems.length >= 3;

  useEffect(() => {
    if (!hasToc || !contentRef.current) return;
    const headingEls = tocItems
      .map(({ slug }) => contentRef.current?.querySelector(`#${CSS.escape(slug)}`))
      .filter((el): el is Element => Boolean(el));
    if (headingEls.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "0px 0px -80% 0px", threshold: 0 }
    );
    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, hasToc]);

  return (
    <div className={cn("flex gap-12", className)}>
      <div ref={contentRef} className="min-w-0 max-w-[70ch] flex-1">
        {hasToc && (
          <details className="mb-8 rounded-md border border-border bg-sheet px-4 py-3 xl:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
              On this page
              <ChevronDown className="size-4 text-muted-foreground transition-transform [details[open]_&]:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-3">
              <TocList items={tocItems} activeSlug={activeSlug} />
            </div>
          </details>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeHighlight, { detect: true }]]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
      {hasToc && (
        <aside className="hidden w-56 shrink-0 xl:block">
          <nav aria-label="On this page" className="sticky top-24 flex flex-col gap-3">
            <p className="text-sm font-semibold">On this page</p>
            <TocList items={tocItems} activeSlug={activeSlug} />
          </nav>
        </aside>
      )}
    </div>
  );
}
