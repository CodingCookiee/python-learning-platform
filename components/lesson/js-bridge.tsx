"use client";

import { useCallback, useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);

export interface JsBridgeProps {
  concept: string;
  javascriptCode: string;
  pythonCode: string;
  keyDifferences?: string[];
  explanation?: string;
  className?: string;
}

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

interface CodePanelProps {
  language: "javascript" | "python";
  code: string;
}

function CodePanel({ language, code }: CodePanelProps) {
  const highlighted = hljs.highlight(code, { language }).value;
  const isJs = language === "javascript";
  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 border-b",
          isJs ? "bg-yellow-500/10 border-yellow-500/20" : "bg-blue-500/10 border-blue-500/20"
        )}
      >
        <span
          className={cn(
            "font-heading text-xs font-semibold tracking-widest uppercase",
            isJs ? "text-yellow-700 dark:text-yellow-400" : "text-blue-700 dark:text-blue-400"
          )}
        >
          {isJs ? "JS" : "PY"}
        </span>
        <span
          className={cn(
            "text-xs",
            isJs
              ? "text-yellow-700/70 dark:text-yellow-400/70"
              : "text-blue-700/70 dark:text-blue-400/70"
          )}
        >
          {isJs ? "JavaScript" : "Python"}
        </span>
      </div>
      <div className="relative group">
        <CopyButton code={code} />
        <pre className="bg-muted/50 border-0 p-4 overflow-x-auto text-sm font-mono hljs m-0">
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}

export function JsBridge({
  concept,
  javascriptCode,
  pythonCode,
  keyDifferences,
  explanation,
  className,
}: JsBridgeProps) {
  return (
    <div className={cn("border border-border bg-card ring-1 ring-foreground/5", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-heading text-sm font-semibold">{concept}</span>
        <span className="inline-flex items-center border border-border bg-muted/50 px-2 py-0.5 font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          JavaScript Bridge
        </span>
      </div>
      <div className="sm:hidden">
        <Tabs defaultValue="python">
          <TabsList className="w-full rounded-none border-b border-border bg-muted/30 p-0 h-auto">
            <TabsTrigger value="python" className="flex-1 rounded-none border-0 py-2.5">
              Python
            </TabsTrigger>
            <TabsTrigger value="javascript" className="flex-1 rounded-none border-0 py-2.5">
              JavaScript
            </TabsTrigger>
          </TabsList>
          <TabsContent value="python">
            <CodePanel language="python" code={pythonCode} />
          </TabsContent>
          <TabsContent value="javascript">
            <CodePanel language="javascript" code={javascriptCode} />
          </TabsContent>
        </Tabs>
      </div>
      <div className="hidden sm:grid sm:grid-cols-2 divide-x divide-border">
        <CodePanel language="javascript" code={javascriptCode} />
        <CodePanel language="python" code={pythonCode} />
      </div>
      {keyDifferences && keyDifferences.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Key Differences
          </p>
          <ul className="flex flex-col gap-1">
            {keyDifferences.map((diff, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span aria-hidden="true" className="mt-0.5 shrink-0">
                  {">"}
                </span>
                <span>{diff}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {explanation && (
        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground leading-relaxed">
          {explanation}
        </div>
      )}
    </div>
  );
}
