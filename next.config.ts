import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-side grading (GRADING_MODE=server) runs Pyodide in Node worker threads
  serverExternalPackages: ["pyodide"],
  outputFileTracingIncludes: {
    "/api/exercises/*/submit": [
      "./scripts/content/pyodide-pool.mjs",
      "./scripts/content/pyodide-thread.mjs",
      "./public/py/*.py",
      "./node_modules/pyodide/**/*",
    ],
  },
};

export default nextConfig;
