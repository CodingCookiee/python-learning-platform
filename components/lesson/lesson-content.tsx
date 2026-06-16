"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Helpers

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractTocItems(markdown: string): TocItem[] {
  const regex = /^(#{2,3})\s+(.+)/gm;
  const items: TocItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const level = match[1].length as 2 | 3;
    const text = match[2].trim();
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

// CopyButton

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy code"}
      className="absolute right-2 top-2 opacity-60 hover:opacity-100"
    >
      {copied ? (
        <Check className="size-3" aria-hidden="true" />
      ) : (
        <Copy className="size-3" aria-hidden="true" />
      )}
    </Button>
  );
}

// TableOfContents

interface TocProps {
  items: TocItem[];
  activeSlug: string | null;
}

function TableOfContents({ items, activeSlug }: TocProps) {
  return (
    <nav aria-label="Table of contents" className="sticky top-24 self-start w-full">
      <p className="mb-3 font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
        On this page
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.slug} className={item.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${item.slug}`}
              className={cn(
                "block text-xs leading-relaxed transition-colors hover:text-foreground",
                activeSlug === item.slug ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// LessonContent

export function LessonContent({ content, className }: LessonContentProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tocItems = extractTocItems(content);
  const hasToc = tocItems.length >= 3;

  useEffect(() => {
    if (!hasToc) return;
    const headingEls: Element[] = [];
    if (contentRef.current) {
      tocItems.forEach(({ slug }) => {
        const el = contentRef.current?.querySelector(`#${slug}`);
        if (el) headingEls.push(el);
      });
    }
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

  const components: Components = {
    pre({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
      type CodeEl = React.ReactElement<ComponentPropsWithoutRef<"code">>;
      let codeText = "";
      let language = "";
      const child = children as CodeEl | null;
      if (child && typeof child === "object" && "props" in child) {
        const codeProps = child.props;
        if (typeof codeProps.children === "string") {
          codeText = codeProps.children;
        }
        const classNameVal = typeof codeProps.className === "string" ? codeProps.className : "";
        const langMatch = /language-(\w+)/.exec(classNameVal);
        if (langMatch) language = langMatch[1];
      }
      return (
        <div className="relative my-4 group">
          {language && (
            <span className="absolute left-4 top-2 font-heading text-[10px] font-semibold tracking-widest uppercase text-muted-foreground select-none pointer-events-none">
              {language}
            </span>
          )}
          <CopyButton code={codeText} />
          <pre
            {...props}
            className={cn(
              "bg-muted/50 border border-border p-4 overflow-x-auto text-sm font-mono",
              language && "pt-8"
            )}
          >
            {children}
          </pre>
        </div>
      );
    },

    code({ children, className: codeClassName, ...props }: ComponentPropsWithoutRef<"code">) {
      const isBlock = /language-/.test(codeClassName ?? "");
      if (isBlock) {
        return (
          <code className={codeClassName} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className="bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground dark:text-foreground"
          {...props}
        >
          {children}
        </code>
      );
    },

    h1({ children, ...props }: ComponentPropsWithoutRef<"h1">) {
      const text = typeof children === "string" ? children : "";
      return (
        <h1
          id={slugify(text)}
          className="font-heading text-2xl font-semibold mt-8 mb-4 scroll-mt-24"
          {...props}
        >
          {children}
        </h1>
      );
    },

    h2({ children, ...props }: ComponentPropsWithoutRef<"h2">) {
      const text = typeof children === "string" ? children : "";
      return (
        <h2
          id={slugify(text)}
          className="font-heading text-xl font-semibold mt-8 mb-3 scroll-mt-24"
          {...props}
        >
          {children}
        </h2>
      );
    },

    h3({ children, ...props }: ComponentPropsWithoutRef<"h3">) {
      const text = typeof children === "string" ? children : "";
      return (
        <h3
          id={slugify(text)}
          className="font-heading text-lg font-semibold mt-6 mb-2 scroll-mt-24"
          {...props}
        >
          {children}
        </h3>
      );
    },

    blockquote({ children, ...props }: ComponentPropsWithoutRef<"blockquote">) {
      return (
        <blockquote
          className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4"
          {...props}
        >
          {children}
        </blockquote>
      );
    },

    table({ children, ...props }: ComponentPropsWithoutRef<"table">) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse" {...props}>
            {children}
          </table>
        </div>
      );
    },

    td({ children, ...props }: ComponentPropsWithoutRef<"td">) {
      return (
        <td className="border border-border px-3 py-2 text-sm" {...props}>
          {children}
        </td>
      );
    },

    th({ children, ...props }: ComponentPropsWithoutRef<"th">) {
      return (
        <th
          className="border border-border px-3 py-2 text-sm font-semibold text-left bg-muted/50"
          {...props}
        >
          {children}
        </th>
      );
    },

    a({ children, href, ...props }: ComponentPropsWithoutRef<"a">) {
      return (
        <a
          href={href}
          className="text-primary underline underline-offset-4 hover:text-primary/80"
          target={href?.startsWith("http") ? "_blank" : undefined}
          rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
          {...props}
        >
          {children}
        </a>
      );
    },

    p({ children, ...props }: ComponentPropsWithoutRef<"p">) {
      return (
        <p className="text-foreground leading-relaxed mb-4" {...props}>
          {children}
        </p>
      );
    },

    ul({ children, ...props }: ComponentPropsWithoutRef<"ul">) {
      return (
        <ul className="list-disc pl-6 mb-4 flex flex-col gap-1" {...props}>
          {children}
        </ul>
      );
    },

    ol({ children, ...props }: ComponentPropsWithoutRef<"ol">) {
      return (
        <ol className="list-decimal pl-6 mb-4 flex flex-col gap-1" {...props}>
          {children}
        </ol>
      );
    },

    li({ children, ...props }: ComponentPropsWithoutRef<"li">) {
      return (
        <li className="text-foreground leading-relaxed text-sm" {...props}>
          {children}
        </li>
      );
    },
  };

  return (
    <div className={cn("flex gap-8", className)}>
      <div ref={contentRef} className="min-w-0 flex-1">
        {hasToc && (
          <nav
            aria-label="Table of contents"
            className="xl:hidden mb-6 border border-border bg-muted/30 p-4"
          >
            <p className="mb-2 font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              On this page
            </p>
            <ul className="flex flex-col gap-1">
              {tocItems.map((item) => (
                <li key={item.slug} className={item.level === 3 ? "pl-3" : ""}>
                  <a
                    href={`#${item.slug}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
        <aside className="hidden xl:block w-48 shrink-0">
          <TableOfContents items={tocItems} activeSlug={activeSlug} />
        </aside>
      )}
    </div>
  );
}
