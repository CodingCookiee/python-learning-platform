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
    summary: "Syntax, collections, control flow and functions.",
  },
  {
    key: "yellow",
    label: "Yellow belt",
    fromModule: 4,
    toModule: 7,
    summary: "Idioms and the standard library, objects, errors and files, and testing.",
  },
  {
    key: "green",
    label: "Green belt",
    fromModule: 8,
    toModule: 10,
    summary: "Generators and decorators, types and Pydantic, and tooling.",
  },
  {
    key: "blue",
    label: "Blue belt",
    fromModule: 11,
    toModule: 13,
    summary: "The data model, concurrency and performance.",
  },
  {
    key: "brown",
    label: "Brown belt",
    fromModule: 14,
    toModule: 16,
    summary: "HTTP clients, FastAPI services and databases.",
  },
];

export const TOTAL_PYTHON_MODULES = BELTS[BELTS.length - 1]!.toModule;

/** AI automation track: one dan grade per module, 2nd to 9th */
export const DAN_TRACK: Array<{ dan: number; title: string }> = [
  { dan: 2, title: "Automation foundations" },
  { dan: 3, title: "LLM fundamentals" },
  { dan: 4, title: "Structured output & tool calling" },
  { dan: 5, title: "Retrieval (RAG)" },
  { dan: 6, title: "Agents" },
  { dan: 7, title: "MCP servers" },
  { dan: 8, title: "Production AI systems" },
  { dan: 9, title: "Portfolio & client work" },
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
