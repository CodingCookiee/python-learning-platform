/**
 * Code Execution Service client utility.
 *
 * Calls the Python code execution microservice from Next.js API routes.
 * Falls back gracefully when the service is unavailable so the platform
 * can continue to function using client-provided results.
 *
 * Environment variables (set in .env.local or Vercel dashboard):
 *   CODE_EXECUTION_API_URL  — base URL of the microservice (e.g. http://localhost:8000)
 *   CODE_EXECUTION_API_KEY  — secret API key sent in the X-API-Key header
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestCase {
  /** Human-readable description of the test */
  description: string;
  /** Optional stdin to pipe into the process */
  input?: string;
  /** Expected output (trimmed string comparison) */
  expected: string;
}

export interface TestResult {
  description: string;
  passed: boolean;
  actual: string;
  expected: string;
  error: string | null;
}

export interface ExecutionResult {
  /** Whether all test cases passed */
  success: boolean;
  /** Per-test-case results */
  results: TestResult[];
  /** Total execution time in milliseconds */
  executionTimeMs: number;
  /** True when results came from the microservice; false when using fallback */
  fromService: boolean;
}

// ---------------------------------------------------------------------------
// Internal request/response shapes (matching the microservice API)
// ---------------------------------------------------------------------------

interface ServiceTestCase {
  description: string;
  input?: string | null;
  expected: string;
}

interface ServiceTestResult {
  description: string;
  passed: boolean;
  actual: string;
  expected: string;
  error: string | null;
}

interface ServiceResponse {
  success: boolean;
  results: ServiceTestResult[];
  execution_time_ms: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute Python code against the provided test cases using the microservice.
 *
 * @param code       Python source code to run
 * @param testCases  Array of test cases (input + expected output)
 * @param timeout    Per-test timeout in seconds (default 10, max 30)
 * @returns          ExecutionResult — always resolves, never rejects
 *
 * @remarks
 * When `CODE_EXECUTION_API_URL` is not set or the service request fails, the
 * function returns a result with `fromService: false` and empty results, allowing
 * the caller to fall back to client-provided values.
 */
export async function executeCode(
  code: string,
  testCases: TestCase[],
  timeout = 10
): Promise<ExecutionResult> {
  const serviceUrl = process.env.CODE_EXECUTION_API_URL;
  const apiKey = process.env.CODE_EXECUTION_API_KEY;

  if (!serviceUrl) {
    // Service not configured — caller should use client-provided results
    return buildFallbackResult();
  }

  const endpoint = `${serviceUrl.replace(/\/$/, "")}/execute`;

  const body: {
    code: string;
    test_cases: ServiceTestCase[];
    timeout: number;
  } = {
    code,
    test_cases: testCases.map((tc) => ({
      description: tc.description,
      input: tc.input ?? null,
      expected: tc.expected,
    })),
    timeout: Math.min(Math.max(timeout, 1), 30),
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      // Server-side fetch — apply a generous wall-clock timeout to avoid
      // blocking the API route indefinitely if the service is slow/down.
      signal: AbortSignal.timeout((timeout + 5) * 1000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`[code-execution] Service returned ${response.status}: ${text}`);
      return buildFallbackResult();
    }

    const data = (await response.json()) as ServiceResponse;

    return {
      success: data.success,
      results: data.results.map((r) => ({
        description: r.description,
        passed: r.passed,
        actual: r.actual,
        expected: r.expected,
        error: r.error,
      })),
      executionTimeMs: data.execution_time_ms,
      fromService: true,
    };
  } catch (error) {
    // Network error, timeout, or JSON parse failure — degrade gracefully
    console.error("[code-execution] Failed to reach execution service:", error);
    return buildFallbackResult();
  }
}

/**
 * Check whether the code execution service is configured and reachable.
 * Useful for health-check endpoints or conditional UI rendering.
 */
export async function isExecutionServiceAvailable(): Promise<boolean> {
  const serviceUrl = process.env.CODE_EXECUTION_API_URL;
  if (!serviceUrl) return false;

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFallbackResult(): ExecutionResult {
  return {
    success: false,
    results: [],
    executionTimeMs: 0,
    fromService: false,
  };
}
