import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { connectRepo, storeReport, suiteFor, suitePayload, verifyLink, viewOf } from "@/lib/ci/links";
import { getBlackBeltStatus } from "@/lib/black-belt";
import { REPORTER } from "@/lib/ci/workflow";
import { makeLearner } from "./helpers";

const python = process.platform === "win32" ? "python" : "python3";
let learner: Awaited<ReturnType<typeof makeLearner>>;
let project: { id: string; title: string };

beforeAll(async () => {
  learner = await makeLearner("ci");
  project = await prisma.project.findFirstOrThrow({ where: { slug: "receipt-printer" }, select: { id: true, title: true } });
});
afterAll(() => learner.cleanup());
afterEach(() => vi.unstubAllGlobals());

/**
 * GitHub's API with one run whose state each test sets ("missing": GitHub has no such run;
 * "limited": rate limited); everything else goes to the real network. Returns the calls made.
 */
function fakeGitHub(run: Record<string, unknown> | null | "missing" | "limited", workflowFile = "") {
  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (!url.startsWith("https://api.github.com/")) return realFetch(input, init);
    calls.push(url);
    if (run === "limited") return new Response("{}", { status: 403 });
    if (url.includes("/contents/.github/workflows/pylearn.yml")) return new Response(workflowFile);
    if (run === "missing") return new Response("{}", { status: 404 });
    if (!run) return new Response(JSON.stringify({ workflow_runs: [] }));
    return new Response(JSON.stringify(url.includes("/workflows/") ? { workflow_runs: [run] } : run));
  });
  return calls;
}

describe("GitHub Actions checks", () => {
  let link: Awaited<ReturnType<typeof connectRepo>>;
  let yaml: string;

  it("serve the suite with the runner files", async () => {
    const suite = (await suiteFor("capstone", project.id))!;
    expect(Object.keys(suite.files)).toContain("test_receipt.py");
    const payload = suitePayload(suite);
    expect(payload.requirements[0]).toBe("pytest>=8.4");
    expect(Object.keys(payload.files)).toEqual(expect.arrayContaining(["pytest.ini", REPORTER]));
    link = await connectRepo(learner.user.id, "capstone", project.id, "you/receipt");
    yaml = viewOf(link, project.title).workflow;
  });

  it("the workflow's fetch and report steps work (run with real Python)", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ci-test-"));
    try {
      mkdirSync(path.join(dir, ".pylearn"));
      writeFileSync(path.join(dir, ".pylearn", "suite.json"), JSON.stringify(suitePayload((await suiteFor("capstone", project.id))!)));
      const fetchStep = yaml.split("\n").find((l) => l.trim().startsWith('python -c "import json'))!.trim();
      await promisify(execFile)(python, ["-c", fetchStep.slice('python -c "'.length, -1)], { cwd: dir });
      expect(readFileSync(path.join(dir, ".pylearn", "test_receipt.py"), "utf8")).toContain("def test_");

      writeFileSync(
        path.join(dir, ".pylearn", "report.xml"),
        '<testsuites><testsuite><testcase classname="t" name="test_a"/><testcase classname="t" name="test_b"><failure message="assert 1 == 2">boom</failure></testcase></testsuite></testsuites>'
      );
      const received: Array<{ url?: string; body: { tests: Array<{ outcome: string }> } }> = [];
      const server = createServer((req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          received.push({ url: req.url, body: JSON.parse(body) });
          res.end("{}");
        });
      });
      await new Promise<void>((r) => server.listen(0, r));
      const { port } = server.address() as { port: number };
      await promisify(execFile)(python, [path.join(".pylearn", REPORTER)], {
        cwd: dir,
        env: { ...process.env, PYLEARN_URL: `http://127.0.0.1:${port}`, PYLEARN_TOKEN: link.token, GITHUB_REPOSITORY: "you/receipt", GITHUB_RUN_ID: "123", GITHUB_SHA: "abc1234" },
      });
      server.close();
      expect(received[0]?.url).toBe(`/api/ci/report/${link.token}`);
      expect(received[0]?.body.tests.map((t) => t.outcome)).toEqual(["passed", "failed"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const run = (over: Record<string, unknown> = {}) => ({
    id: 123,
    path: ".github/workflows/pylearn.yml",
    head_sha: "abc1234",
    status: "completed",
    conclusion: "success",
    html_url: "https://github.com/you/receipt/actions/runs/123",
    repository: { full_name: "you/receipt" },
    ...over,
  });

  it("count a run only when GitHub confirms our unmodified workflow passed in the connected repo", async () => {
    await storeReport(link.token, { repository: "you/receipt", runId: "123", sha: "abc1234", tests: [] });

    fakeGitHub(run({ status: "in_progress", conclusion: null }), yaml);
    expect((await verifyLink(link.id, true))?.status).toBe("reported");

    expect(yaml).toContain("python -P -m pytest");
    fakeGitHub(run(), yaml.replace("python -P -m pytest", "true || python -P -m pytest"));
    expect((await verifyLink(link.id, true))?.status).toBe("invalid");

    fakeGitHub(run({ repository: { full_name: "someone/else" } }), yaml);
    expect((await verifyLink(link.id, true))?.status).toBe("invalid");

    fakeGitHub(run({ conclusion: "failure" }), yaml);
    expect((await verifyLink(link.id, true))?.status).toBe("failed");

    fakeGitHub(run(), yaml.replace(/\n/g, "\r\n"));
    const passed = await verifyLink(link.id, true);
    expect(passed?.status).toBe("passed");
    expect(passed?.verifiedAt).not.toBeNull();
  });

  it("count a passed capstone toward the black belt", async () => {
    expect((await getBlackBeltStatus(learner.user.id)).capstones.approved).toBe(1);
  });

  it("keep a pass when anyone with the public token posts a bogus report", async () => {
    const posted = await storeReport(link.token, { repository: "you/receipt", runId: "999", sha: "def5678", tests: [] });
    // The run link is rebuilt from the connected repo, never taken from the report
    expect(posted?.runUrl).toBe("https://github.com/you/receipt/actions/runs/999");
    fakeGitHub("missing");
    const checked = await verifyLink(link.id, true);
    expect(checked).toMatchObject({ status: "invalid" });
    expect(checked?.verifiedAt).not.toBeNull();
    expect((await getBlackBeltStatus(learner.user.id)).capstones.approved).toBe(1);
  });

  it("keep a pass when a later run fails", async () => {
    await storeReport(link.token, { repository: "you/receipt", runId: "124", sha: "abc9999", tests: [] });
    fakeGitHub(run({ id: 124, head_sha: "abc9999", conclusion: "failure" }), yaml);
    expect((await verifyLink(link.id, true))?.status).toBe("failed");
    expect((await getBlackBeltStatus(learner.user.id)).capstones.approved).toBe(1);
  });

  it("back off GitHub after a rate limit instead of asking again on every poll", async () => {
    await storeReport(link.token, { repository: "you/receipt", runId: "125", sha: "abc1111", tests: [] });
    const limited = fakeGitHub("limited");
    const first = await verifyLink(link.id, true);
    expect(first).toMatchObject({ status: "reported" });
    expect(first?.statusDetail).toMatch(/rate limiting/);
    expect(limited).toHaveLength(1);
    // The page's next poll doesn't reach GitHub
    await verifyLink(link.id);
    expect(limited).toHaveLength(1);
  });

  it("start over with a new token when the repo changes", async () => {
    const moved = await connectRepo(learner.user.id, "capstone", project.id, "you/other-repo");
    expect(moved).toMatchObject({ status: "waiting", verifiedAt: null });
    expect(moved.token).not.toBe(link.token);
  });
});
