import type { NextConfig } from "next";

// Everywhere, including files and API responses. The Content-Security-Policy is per request,
// so it's set in proxy.ts instead.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Ignored over plain HTTP, so it's harmless locally
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // A local production build for tests can go to its own folder (NEXT_DIST_DIR=.next-e2e), so it
  // never overwrites what a running `next dev` is serving from .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Nothing uses next/image, so the optimizer endpoint (/_next/image) is only attack surface
  images: { unoptimized: true },
  // Server-side grading (GRADING_MODE=server) runs Pyodide in Node worker threads
  serverExternalPackages: ["pyodide"],
  outputFileTracingIncludes: {
    "/api/exercises/*/submit": [
      "./scripts/content/pyodide-pool.mjs",
      "./scripts/content/pyodide-thread.mjs",
      "./public/py/*.py",
      "./node_modules/pyodide/**/*",
    ],
    // The certificate PNG reads its fonts from disk
    "/certificates/*/image": ["./assets/fonts/*.ttf"],
  },
};

export default nextConfig;
