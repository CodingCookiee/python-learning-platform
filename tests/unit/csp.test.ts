import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { contentSecurityPolicy, MONACO_CDN, newNonce, PYODIDE_CDN } from "@/lib/csp";

const directive = (policy: string, name: string) =>
  policy
    .split("; ")
    .find((d) => d.startsWith(`${name} `))
    ?.split(" ")
    .slice(1) ?? [];

describe("the Content-Security-Policy", () => {
  const prod = contentSecurityPolicy({ nonce: "abc123", dev: false, https: true });

  it("only runs scripts from the site, the nonce, and the editor's and Python's CDN paths", () => {
    expect(directive(prod, "script-src")).toEqual(["'self'", "'nonce-abc123'", MONACO_CDN, PYODIDE_CDN, "'wasm-unsafe-eval'"]);
    expect(directive(prod, "script-src")).not.toContain("'unsafe-inline'");
    expect(MONACO_CDN).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@[\d.]+\/$/);
  });

  it("allows the exact Pyodide the Python worker loads", () => {
    const worker = readFileSync("public/workers/python-worker.mjs", "utf8");
    expect(worker).toContain(`const INDEX_URL = "${PYODIDE_CDN}"`);
    expect(directive(prod, "worker-src")).toContain(PYODIDE_CDN);
    expect(directive(prod, "connect-src")).toEqual(expect.arrayContaining([PYODIDE_CDN, "https://files.pythonhosted.org"]));
  });

  it("allows the exact Monaco the editor loads", () => {
    const loader = readFileSync("node_modules/@monaco-editor/loader/lib/es/config/index.js", "utf8");
    expect(loader).toContain(`'${MONACO_CDN}min/vs'`);
  });

  it("can't be framed, and blocks plugins and base or form hijacking", () => {
    expect(directive(prod, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(prod, "object-src")).toEqual(["'none'"]);
    expect(directive(prod, "base-uri")).toEqual(["'self'"]);
    expect(directive(prod, "form-action")).toEqual(["'self'"]);
  });

  it("allows eval and the reload socket only in development", () => {
    expect(directive(prod, "script-src")).not.toContain("'unsafe-eval'");
    const dev = contentSecurityPolicy({ nonce: "abc123", dev: true, https: false });
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws:");
  });

  it("upgrades insecure requests only when served over HTTPS", () => {
    expect(prod).toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy({ nonce: "n", dev: false, https: false })).not.toContain("upgrade-insecure-requests");
  });

  it("uses a fresh nonce each time", () => {
    expect(newNonce()).not.toBe(newNonce());
    expect(newNonce()).toMatch(/^[A-Za-z0-9+/=]{24,}$/);
  });
});
