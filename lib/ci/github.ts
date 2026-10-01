/**
 * GitHub's public REST API, to confirm what a workflow reported. Works without a
 * token for public repos (60 requests an hour per server IP); set GITHUB_TOKEN to
 * any personal access token, with no scopes, for 5,000 an hour.
 */

export const REPO_PATTERN = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;

/** "owner/name" from a repo URL or "owner/name", or null */
export function parseRepo(input: string): string | null {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const m = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+\/[^/\s]+)/i) ?? trimmed.match(/^([^/\s]+\/[^/\s]+)$/);
  const repo = m?.[1] ?? null;
  return repo && REPO_PATTERN.test(repo) ? repo : null;
}

export type GhResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function gh<T>(url: string, accept = "application/vnd.github+json"): Promise<GhResult<T>> {
  const headers: Record<string, string> = { accept, "user-agent": "pylearn", "x-github-api-version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  } catch {
    return { ok: false, status: 0, error: "Couldn't reach GitHub. Try again in a moment." };
  }
  if (res.status === 404) return { ok: false, status: 404, error: "GitHub can't find that. Is the repository public?" };
  if (res.status === 403 || res.status === 429) {
    return { ok: false, status: res.status, error: "GitHub is rate limiting pylearn right now. Try again in a few minutes." };
  }
  if (!res.ok) return { ok: false, status: res.status, error: `GitHub answered ${res.status}.` };
  const data = (accept.includes("raw") ? await res.text() : await res.json()) as T;
  return { ok: true, data };
}

export interface GhRepo {
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

export interface GhRun {
  id: number;
  path: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  repository: { full_name: string };
}

export function getRepo(repo: string) {
  return gh<GhRepo>(`https://api.github.com/repos/${repo}`);
}

export function getRun(repo: string, runId: string) {
  return gh<GhRun>(`https://api.github.com/repos/${repo}/actions/runs/${encodeURIComponent(runId)}`);
}

export async function latestRun(repo: string): Promise<GhResult<GhRun | null>> {
  const r = await gh<{ workflow_runs: GhRun[] }>(
    `https://api.github.com/repos/${repo}/actions/workflows/pylearn.yml/runs?per_page=1&exclude_pull_requests=true`
  );
  if (!r.ok) return r.status === 404 ? { ok: true, data: null } : r;
  return { ok: true, data: r.data.workflow_runs[0] ?? null };
}

/** The workflow file exactly as it was at a commit */
export function getFileAt(repo: string, sha: string, path: string) {
  return gh<string>(`https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(sha)}`, "application/vnd.github.raw+json");
}
