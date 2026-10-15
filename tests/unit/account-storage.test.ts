import { afterEach, describe, expect, it, vi } from "vitest";
import { accountKey, forgetAccountStorage, sweepLegacyStorage } from "@/lib/account-storage";

/** A Storage that keeps its keys in a Map */
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

/** A page signed in as `account` ("" for signed out) */
function page(account: string) {
  vi.stubGlobal("document", {
    querySelector: () => (account ? { getAttribute: () => account } : null),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("per-account browser storage", () => {
  it("keys drafts to the signed-in account, so another account never opens them", () => {
    const local = memoryStorage();
    vi.stubGlobal("localStorage", local);
    page("acct-a");
    local.setItem(accountKey("drill-123"), 'print("fixed by A")');
    page("acct-b");
    expect(local.getItem(accountKey("drill-123"))).toBeNull();
    page("");
    expect(accountKey("drill-123")).toBe("drill-123");
  });

  it("clears the account's keys and old shared drafts on sign-out, and leaves preferences", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", session);
    page("acct-a");
    local.setItem("drill-1@acct-a", "mine");
    local.setItem("drill-1@acct-a:t", "1");
    local.setItem("drill-1@acct-b", "theirs");
    local.setItem("scratch-9", "an old shared draft");
    local.setItem("app-theme", "dark");
    session.setItem("sensei-chat@acct-a", "[]");
    forgetAccountStorage();
    expect([...Array(local.length).keys()].map((i) => local.key(i)).sort()).toEqual(["app-theme", "drill-1@acct-b"]);
    expect(session.length).toBe(0);
  });

  it("sweeps only the old shared keys on load", () => {
    const local = memoryStorage();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", memoryStorage());
    page("acct-a");
    local.setItem("drill-1", "shared");
    local.setItem("drill-1:t", "1");
    local.setItem("drill-1@acct-a", "mine");
    sweepLegacyStorage();
    expect(local.getItem("drill-1")).toBeNull();
    expect(local.getItem("drill-1:t")).toBeNull();
    expect(local.getItem("drill-1@acct-a")).toBe("mine");
  });
});
