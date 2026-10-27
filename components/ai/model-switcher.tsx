"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROVIDER_LABEL, PROVIDERS, type Provider } from "@/lib/ai/gateway";
import { modelGroups, modelName, resolveChoice, type ModelChoice, type SavedKey } from "@/lib/ai/models";
import { accountKey } from "@/lib/account-storage";
import { cn } from "@/lib/utils";

/**
 * Which model answers, picked where the learner asks: the tutor, the Sensei, a capstone review, the
 * examiner's review. Each place remembers its own pick in this browser, under the account's key, so
 * signing out clears it and another account never sees it (lib/account-storage.ts).
 */

export type ModelSurface = "tutor" | "sensei" | "review" | "examiner";

const storeKey = (surface: ModelSurface) => accountKey(`ai-model-${surface}`);

// Tells every switcher on the page when one of them stores a pick
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStored(surface: ModelSurface): string | null {
  try {
    return localStorage.getItem(storeKey(surface));
  } catch {
    return null;
  }
}

function parse(raw: string | null): ModelChoice | null {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<ModelChoice>) : null;
    return value && PROVIDERS.includes(value.provider as Provider) && typeof value.model === "string"
      ? { provider: value.provider as Provider, model: value.model }
      : null;
  } catch {
    return null;
  }
}

/**
 * The model this place uses: the learner's last pick here while their keys still offer it, else the
 * default key's model. Null without any key.
 */
export function useModelChoice(surface: ModelSurface, keys: SavedKey[]): [ModelChoice | null, (choice: ModelChoice) => void] {
  const stored = React.useSyncExternalStore(subscribe, () => readStored(surface), () => null);
  // Holds the pick for this page even where storage is blocked
  const [picked, setPicked] = React.useState<ModelChoice | null>(null);
  const choice = resolveChoice(keys, picked ?? parse(stored));

  function choose(next: ModelChoice) {
    setPicked(next);
    try {
      localStorage.setItem(storeKey(surface), JSON.stringify(next));
    } catch {
      // Remembered for this page only
    }
    for (const notify of listeners) notify();
  }
  return [choice, choose];
}

/** The model's name with a menu of every model the learner's keys can run, grouped by provider */
export function ModelSwitcher({
  keys,
  choice,
  onChoose,
  disabled,
  className,
}: {
  keys: SavedKey[];
  choice: ModelChoice | null;
  onChoose: (choice: ModelChoice) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (!choice) return null;
  const name = modelName(choice.provider, choice.model);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={`Model: ${name}. Change model`}
          className={cn(
            "inline-flex max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-sm px-1.5 py-1 text-xs font-semibold text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:bg-accent",
            className
          )}
        >
          <span className="truncate">{name}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuRadioGroup
          value={JSON.stringify(choice)}
          onValueChange={(value) => {
            const next = parse(value);
            if (next) onChoose(next);
          }}
        >
          {modelGroups(keys).map((group, i) => (
            <React.Fragment key={group.provider}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{PROVIDER_LABEL[group.provider]}</DropdownMenuLabel>
              {group.models.map((m) => (
                <DropdownMenuRadioItem key={m.id} value={JSON.stringify({ provider: group.provider, model: m.id })}>
                  <span className="truncate">{m.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </React.Fragment>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">Other models and keys in Settings</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Answering with [model ▾]": the switcher with what it's for, for the foot of a chat or beside a review */
export function AnsweringWith({
  label = "Answering with",
  ...props
}: React.ComponentProps<typeof ModelSwitcher> & { label?: string }) {
  if (!props.choice) return null;
  return (
    <div className="flex min-w-0 items-center gap-0.5 text-xs text-muted-foreground">
      <span className="shrink-0">{label}</span>
      <ModelSwitcher {...props} />
    </div>
  );
}
