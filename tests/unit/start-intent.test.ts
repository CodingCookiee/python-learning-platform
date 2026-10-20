import { afterEach, describe, expect, it, vi } from "vitest";
import { readStart, rememberStart } from "@/lib/start-intent";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("the landing page's two ways in", () => {
  it("remembers \"I've never coded\" through sign-up", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    rememberStart("new");
    expect(readStart()).toBe("new");
  });

  it("forgets it when the visitor then says they already code", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    rememberStart("new");
    rememberStart("code");
    expect(readStart()).toBeNull();
  });

  it("leaves it alone on a plain visit to sign-up", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    rememberStart("new");
    rememberStart(undefined);
    expect(readStart()).toBe("new");
  });
});
