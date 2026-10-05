import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Three suites, each runnable on its own:
 * - unit: pure logic, no database or network (npm test)
 * - integration: against a real Postgres with migrations applied and content synced
 *   (npm run test:integration; uses DATABASE_URL, from .env locally or the CI service)
 * - python: the Pyodide runner, multi-file drills and server grading, in Node worker
 *   threads (npm run test:python; downloads Pyodide packages on first run)
 */
const alias = { "@": path.resolve(__dirname) };

export default defineConfig({
  resolve: { alias },
  test: {
    // On Windows, Vitest can wait on its own file handles at exit; don't wait long
    teardownTimeout: 2_000,
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          pool: "forks",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup-unit.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          pool: "forks",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/setup-integration.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 60_000,
          // One database, so the files run one at a time
          fileParallelism: false,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "python",
          pool: "forks",
          include: ["tests/python/**/*.test.ts"],
          setupFiles: ["tests/setup-unit.ts"],
          environment: "node",
          testTimeout: 180_000,
          hookTimeout: 180_000,
        },
      },
    ],
  },
});
