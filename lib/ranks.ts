/**
 * Rank system: belts and kyu/dan grades derived from module progress.
 *
 * The Python track counts kyu down from white belt; passing the final module
 * grading earns shodan (1st dan, black belt). The AI automation track then
 * continues through dan ranks. Ranks are derived, never stored.
 */

export type BeltKey = "white" | "yellow" | "green" | "blue" | "brown" | "black";

export interface Belt {
  key: BeltKey;
  label: string;
  /** Inclusive module order range covered by this belt */
  fromModule: number;
  toModule: number;
  /** What the belt stands for, in syllabus terms */
  summary: string;
}

/** Python track belts, keyed to module `order` */
export const BELTS: Belt[] = [
  {
    key: "white",
    label: "White belt",
    fromModule: 1,
    toModule: 3,
    summary: "Syntax, data structures, control flow and functions.",
  },
  {
    key: "yellow",
    label: "Yellow belt",
    fromModule: 4,
    toModule: 7,
    summary: "Objects, files and errors, testing, and packaging.",
  },
  {
    key: "green",
    label: "Green belt",
    fromModule: 8,
    toModule: 10,
    summary: "Async, the advanced language features, and type hints.",
  },
  {
    key: "blue",
    label: "Blue belt",
    fromModule: 11,
    toModule: 13,
    summary: "Web services, databases and data processing.",
  },
  {
    key: "brown",
    label: "Brown belt",
    fromModule: 14,
    toModule: 16,
    summary: "Automation, Web3 and performance.",
  },
];

export const TOTAL_PYTHON_MODULES = BELTS[BELTS.length - 1]!.toModule;

/** AI automation track: planned dan ranks (not yet published) */
export const DAN_TRACK: Array<{ dan: number; title: string }> = [
  { dan: 2, title: "Automation thinking & workflows" },
  { dan: 3, title: "LLM fundamentals" },
  { dan: 4, title: "Structured outputs & tool calling" },
  { dan: 5, title: "Retrieval (RAG)" },
  { dan: 6, title: "Agents" },
  { dan: 7, title: "MCP servers" },
  { dan: 8, title: "Production: evals, cost, security" },
  { dan: 9, title: "Portfolio & getting paid" },
];

export function beltForModule(moduleOrder: number): Belt {
  return (
    BELTS.find((b) => moduleOrder >= b.fromModule && moduleOrder <= b.toModule) ??
    BELTS[BELTS.length - 1]!
  );
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export interface Rank {
  /** e.g. "16 kyu" or "1st dan" */
  label: string;
  /** Numeral to set at monumental scale, e.g. "16" */
  numeral: string;
  /** "kyu" or "dan" */
  grade: "kyu" | "dan";
  belt: BeltKey;
  beltLabel: string;
  /** Stripes earned on the current belt (modules passed within it) */
  stripes: number;
  /** Stripe slots on the current belt */
  stripeSlots: number;
}

/**
 * Rank after passing `modulesPassed` Python modules (in order).
 * 0 passed → 16 kyu white belt; all passed → 1st dan black belt.
 */
export function rankFor(modulesPassed: number): Rank {
  const passed = Math.max(0, Math.min(modulesPassed, TOTAL_PYTHON_MODULES));

  if (passed >= TOTAL_PYTHON_MODULES) {
    return {
      label: "1st dan",
      numeral: "1",
      grade: "dan",
      belt: "black",
      beltLabel: "Black belt",
      stripes: 0,
      stripeSlots: 0,
    };
  }

  const kyu = TOTAL_PYTHON_MODULES - passed;
  const belt = beltForModule(passed + 1);
  return {
    label: `${kyu} kyu`,
    numeral: String(kyu),
    grade: "kyu",
    belt: belt.key,
    beltLabel: belt.label,
    stripes: passed - (belt.fromModule - 1),
    stripeSlots: belt.toModule - belt.fromModule + 1,
  };
}

/** Kyu range a belt spans, e.g. "16–14 kyu" */
export function kyuRange(belt: Belt): string {
  const high = TOTAL_PYTHON_MODULES - belt.fromModule + 1;
  const low = TOTAL_PYTHON_MODULES - belt.toModule + 1;
  return high === low ? `${high} kyu` : `${high}–${low} kyu`;
}

/** CSS color variable for a belt */
export function beltVar(key: BeltKey): string {
  return `var(--belt-${key})`;
}
