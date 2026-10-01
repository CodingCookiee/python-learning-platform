import "dotenv/config";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { prisma } from "../lib/prisma";
import { connectRepo, storeReport, suiteFor, suitePayload, verifyLink, viewOf } from "../lib/ci/links";
import { parseRepo } from "../lib/ci/github";
import { workflowYaml } from "../lib/ci/workflow";
import { getBlackBeltStatus } from "../lib/black-belt";

// The GitHub Actions checks, with GitHub's API mocked and the workflow's own steps run for real
const EMAIL = "ci-probe@example.invalid";
let failures = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 220)}` : ""}`);
};

// A fake GitHub: one run whose state each case sets
const gh = { run: null as null | Record<string, unknown>, workflowFile: "" };
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  if (!url.startsWith("https://api.github.com/")) return realFetch(input, init);
  if (url.includes("/contents/.github/workflows/pylearn.yml")) return new Response(gh.workflowFile, { status: 200 });
  if (url.includes("/actions/runs/") || url.includes("/actions/workflows/pylearn.yml/runs")) {
    if (!gh.run) return new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 });
    const body = url.includes("/workflows/") ? { workflow_runs: [gh.run] } : gh.run;
    return new Response(JSON.stringify(body), { status: 200 });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch;

async function main() {
  // URL parsing
  check("parses repo URLs", parseRepo("https://github.com/you/receipt.git") === "you/receipt" && parseRepo("you/receipt") === "you/receipt" && parseRepo("not a repo") === null);

  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({ data: { email: EMAIL, emailVerified: new Date() } });
  const project = await prisma.project.findFirstOrThrow({ where: { slug: "receipt-printer" } });
  try {
    const suite = (await suiteFor("capstone", project.id))!;
    check("suite has the tests", Object.keys(suite.files).includes("test_receipt.py"));
    const payload = suitePayload(suite);
    check("payload adds the runner files and pytest", "pytest.ini" in payload.files && "report.py" in payload.files && payload.requirements[0] === "pytest");

    let link = await connectRepo(user.id, "capstone", project.id, "you/receipt");
    const yaml = viewOf(link, project.title).workflow;
    const parsed = parseYaml(yaml) as { jobs: { pylearn: { steps: unknown[]; env: Record<string, string> } } };
    check("workflow is valid YAML with our token", parsed.jobs.pylearn.env.PYLEARN_TOKEN === link.token && parsed.jobs.pylearn.steps.length === 6);

    // The workflow's fetch step, run for real on the suite payload
    const dir = mkdtempSync(path.join(os.tmpdir(), "ci-probe-"));
    mkdirSync(path.join(dir, ".pylearn"));
    writeFileSync(path.join(dir, ".pylearn", "suite.json"), JSON.stringify(payload));
    const fetchStep = yaml.split("\n").find((l) => l.trim().startsWith('python -c "import json'))!.trim();
    execFileSync("python", ["-c", fetchStep.slice('python -c "'.length, -1)], { cwd: dir });
    check("fetch step writes the suite", readFileSync(path.join(dir, ".pylearn", "test_receipt.py"), "utf8").includes("def test_") &&
      readFileSync(path.join(dir, ".pylearn", "requirements.txt"), "utf8").startsWith("pytest"));

    // report.py, run for real against a junit file, posting to a local server
    writeFileSync(
      path.join(dir, ".pylearn", "report.xml"),
      `<testsuites><testsuite><testcase classname="test_receipt" name="test_a"/><testcase classname="test_receipt" name="test_b"><failure message="assert 1 == 2">boom</failure></testcase></testsuite></testsuites>`
    );
    const received: unknown[] = [];
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        received.push({ url: req.url, body: JSON.parse(body) });
        res.end(JSON.stringify({ message: "ok" }));
      });
    });
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as { port: number }).port;
    const { stdout: reportOut } = await promisify(execFile)("python", [path.join(".pylearn", "report.py")], {
      cwd: dir,
      env: { ...process.env, PYLEARN_URL: `http://127.0.0.1:${port}`, PYLEARN_TOKEN: link.token, GITHUB_REPOSITORY: "you/receipt", GITHUB_RUN_ID: "123", GITHUB_SHA: "abc1234", GITHUB_SERVER_URL: "https://github.com" },
    });
    console.log("report.py said:", String(reportOut).trim());
    server.close();
    rmSync(dir, { recursive: true, force: true });
    const sent = received[0] as { url: string; body: { tests: Array<{ outcome: string }> } } | undefined;
    check("report.py posts the results", sent?.url === `/api/ci/report/${link.token}` && sent.body.tests.map((t) => t.outcome).join() === "passed,failed", sent);

    // Verification against GitHub
    await storeReport(link.token, { repository: "you/receipt", runId: "123", sha: "abc1234", runUrl: "https://github.com/you/receipt/actions/runs/123", tests: [{ name: "test_a", outcome: "passed" }] });
    const run = (over: Record<string, unknown>) => ({ id: 123, path: ".github/workflows/pylearn.yml", head_sha: "abc1234", status: "completed", conclusion: "success", html_url: "https://github.com/you/receipt/actions/runs/123", repository: { full_name: "you/receipt" }, ...over });

    gh.run = run({ status: "in_progress", conclusion: null });
    gh.workflowFile = yaml;
    check("an unfinished run stays pending", (await verifyLink(link.id, true))?.status === "reported");

    gh.run = run({});
    gh.workflowFile = yaml.replace("python -m pytest", "echo skipped; true || python -m pytest");
    check("an edited workflow doesn't count", (await verifyLink(link.id, true))?.status === "invalid");

    gh.workflowFile = yaml.replace(/\n/g, "\r\n") + "\n   ";
    gh.run = run({ repository: { full_name: "someone/else" } });
    check("a run in another repo doesn't count", (await verifyLink(link.id, true))?.status === "invalid");

    gh.run = run({ conclusion: "failure" });
    check("a failed run is failed", (await verifyLink(link.id, true))?.status === "failed");

    gh.run = run({});
    link = (await verifyLink(link.id, true))!;
    check("our workflow + success = passed (line endings don't matter)", link.status === "passed" && link.verifiedAt !== null, link.statusDetail);
    const bb = await getBlackBeltStatus(user.id);
    check("a passed capstone counts toward the black belt", bb.capstones.approved === 1, bb.capstones);

    const moved = await connectRepo(user.id, "capstone", project.id, "you/other-repo");
    check("changing repo starts over with a new token", moved.status === "waiting" && moved.token !== link.token && moved.verifiedAt === null);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
  console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILED`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
