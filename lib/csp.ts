/**
 * The Content-Security-Policy for pages, set per request by proxy.ts with a fresh nonce
 * (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 *
 * Next.js puts the nonce on its own scripts; next-themes gets it from the root layout. Other
 * scripts come only from this site and two CDN paths: the code editor (Monaco, loaded by
 * @monaco-editor/react, whose workers start from blob:/data: URLs) and Pyodide. The Python
 * worker (public/workers/python-worker.mjs) is a module worker, and Chrome checks its imports
 * and downloads against the page's policy, so Pyodide's path, WebAssembly and PyPI (micropip)
 * are allowed here too.
 */

/** Keep in step with the version @monaco-editor/loader loads (its config/index.js) */
export const MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/";
/** Keep in step with INDEX_URL in public/workers/python-worker.mjs */
export const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
const PYPI = ["https://pypi.org", "https://files.pythonhosted.org"];

export function contentSecurityPolicy(opts: { nonce: string; dev: boolean; https: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // React's dev build needs eval for its error overlays; production never does
    // 'wasm-unsafe-eval' compiles WebAssembly (Python), and allows nothing else
    "script-src": ["'self'", `'nonce-${opts.nonce}'`, MONACO_CDN, PYODIDE_CDN, "'wasm-unsafe-eval'", ...(opts.dev ? ["'unsafe-eval'"] : [])],
    // Inline style attributes (React, Monaco's injected <style>) need 'unsafe-inline'; a nonce here would cancel it
    "style-src": ["'self'", "'unsafe-inline'", MONACO_CDN],
    "font-src": ["'self'", "data:", MONACO_CDN],
    // OAuth sign-ins bring a profile picture from GitHub or Google
    "img-src": ["'self'", "data:", "blob:", "https://avatars.githubusercontent.com", "https://lh3.googleusercontent.com"],
    "connect-src": ["'self'", MONACO_CDN, PYODIDE_CDN, ...PYPI, ...(opts.dev ? ["ws:"] : [])],
    "worker-src": ["'self'", "blob:", "data:", PYODIDE_CDN],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // Only over HTTPS: on plain-HTTP localhost it would break every request
  if (opts.https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** A fresh, unguessable nonce for one response */
export function newNonce(): string {
  return btoa(crypto.randomUUID());
}
