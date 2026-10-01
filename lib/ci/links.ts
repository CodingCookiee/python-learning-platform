import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { publicOrigin } from "@/lib/public-origin";
import { parseLab, recordLabCheck, ensureLabRun } from "@/lib/labs";
import { getFileAt, getRun, latestRun, type GhRun } from "@/lib/ci/github";
import { runnerFiles, sameWorkflow, WORKFLOW_PATH, workflowYaml } from "@/lib/ci/workflow";

/**
 * Connecting a learner's GitHub repo to a capstone's acceptance tests or a github
 * lab, and deciding when a run counts. A run counts only when GitHub's API says it
 * belongs to the connected repo, ran our unmodified workflow file, and succeeded
 * (the tests step fails the job if any test fails).
 */

export type CiKind = "capstone" | "lab";

export interface TestOutcome {
  name: string;
  file?: string;
  outcome: "passed" | "failed" | "skipped";
  message?: string;
}

export interface CiReport {
  passed: number;
  failed: number;
  tests: TestOutcome[];
}

export interface CiLinkView {
  id: string;
  kind: CiKind;
  repo: string;
  status: "waiting" | "reported" | "passed" | "failed" | "invalid";
  statusDetail: string | null;
  runUrl: string | null;
  sha: string | null;
  report: CiReport | null;
  reportedAt: string | null;
  verifiedAt: string | null;
  workflow: string;
  workflowPath: string;
}

export interface Suite {
  title: string;
  files: Record<string, string>;
  requirements: string[];
}

/** The tests for a target, or null if it has none */
export async function suiteFor(kind: CiKind, targetId: string): Promise<Suite | null> {
  if (kind === "capstone") {
    const project = await prisma.project.findFirst({ where: { id: targetId, archivedAt: null }, select: { title: true, acceptance: true } });
    const acc = project?.acceptance as { files?: Record<string, string>; requirements?: string[] } | null;
    if (!project || !acc?.files) return null;
    return { title: project.title, files: acc.files, requirements: acc.requirements ?? [] };
  }
  const lesson = await prisma.lesson.findFirst({ where: { id: targetId, archivedAt: null }, select: { title: true, lab: true } });
  const lab = parseLab(lesson?.lab);
  if (!lesson || lab?.kind !== "github" || !lab.suite) return null;
  return { title: lab.title, files: lab.suite, requirements: lab.requirements };
}

export function viewOf(link: {
  id: string;
  kind: string;
  repo: string;
  status: string;
  statusDetail: string | null;
  runUrl: string | null;
  sha: string | null;
  report: unknown;
  reportedAt: Date | null;
  verifiedAt: Date | null;
  token: string;
}, title: string): CiLinkView {
  return {
    id: link.id,
    kind: link.kind as CiKind,
    repo: link.repo,
    status: link.status as CiLinkView["status"],
    statusDetail: link.statusDetail,
    runUrl: link.runUrl,
    sha: link.sha,
    report: (link.report as CiReport | null) ?? null,
    reportedAt: link.reportedAt?.toISOString() ?? null,
    verifiedAt: link.verifiedAt?.toISOString() ?? null,
    workflow: workflowYaml({ origin: publicOrigin(), token: link.token, title }),
    workflowPath: WORKFLOW_PATH,
  };
}

export async function getLink(userId: string, kind: CiKind, targetId: string) {
  return prisma.ciLink.findUnique({ where: { userId_kind_targetId: { userId, kind, targetId } } });
}

export async function connectRepo(userId: string, kind: CiKind, targetId: string, repo: string) {
  const existing = await getLink(userId, kind, targetId);
  const sameRepo = existing !== null && existing.repo.toLowerCase() === repo.toLowerCase();
  return prisma.ciLink.upsert({
    where: { userId_kind_targetId: { userId, kind, targetId } },
    create: { userId, kind, targetId, repo, token: randomBytes(18).toString("base64url") },
    // A different repo starts over with a new token, so the old repo's workflow stops counting
    update: sameRepo
      ? { repo }
      : {
          repo,
          token: randomBytes(18).toString("base64url"),
          status: "waiting",
          statusDetail: null,
          runId: null,
          runUrl: null,
          sha: null,
          report: Prisma.DbNull,
          reportedAt: null,
          checkedAt: null,
          verifiedAt: null,
        },
  });
}

/** The suite as the workflow downloads it: the tests plus our runner files */
export function suitePayload(suite: Suite) {
  return { files: { ...suite.files, ...runnerFiles() }, requirements: ["pytest", ...suite.requirements] };
}

function summarize(tests: TestOutcome[]): CiReport {
  return {
    passed: tests.filter((t) => t.outcome === "passed").length,
    failed: tests.filter((t) => t.outcome === "failed").length,
    tests,
  };
}

export async function storeReport(
  token: string,
  data: { repository: string; runId: string; sha: string; runUrl: string; tests: TestOutcome[] }
) {
  const link = await prisma.ciLink.findUnique({ where: { token } });
  if (!link) return null;
  // Pending until GitHub confirms the run; a fresh report replaces the last one
  return prisma.ciLink.update({
    where: { id: link.id },
    data: {
      status: "reported",
      statusDetail: data.repository.toLowerCase() === link.repo.toLowerCase() ? null : `Reported from ${data.repository}, not ${link.repo}`,
      runId: data.runId,
      runUrl: data.runUrl,
      sha: data.sha,
      report: summarize(data.tests) as object,
      reportedAt: new Date(),
      checkedAt: null,
    },
  });
}

const RECHECK_MS = 20_000;

/**
 * Ask GitHub about the reported run (or the latest pylearn run when nothing was
 * reported) and settle the status. Throttled per link so polling pages don't burn
 * the API allowance.
 */
export async function verifyLink(linkId: string, force = false) {
  const link = await prisma.ciLink.findUnique({ where: { id: linkId } });
  if (!link) return null;
  if (link.status === "passed" && !force) return link;
  if (!force && link.checkedAt && Date.now() - link.checkedAt.getTime() < RECHECK_MS) return link;

  const suite = await suiteFor(link.kind as CiKind, link.targetId);
  let run: GhRun | null = null;
  let problem: string | null = null;
  if (link.runId) {
    const r = await getRun(link.repo, link.runId);
    if (r.ok) run = r.data;
    else problem = r.error;
  } else {
    const r = await latestRun(link.repo);
    if (r.ok) run = r.data;
    else problem = r.error;
  }

  const update = async (status: string, statusDetail: string | null, extra: Record<string, unknown> = {}) =>
    prisma.ciLink.update({ where: { id: link.id }, data: { status, statusDetail, checkedAt: new Date(), ...extra } });

  if (problem) return update(link.status, problem);
  if (!run) return update("waiting", "No pylearn run yet. Commit the workflow file and push.");
  if (run.repository.full_name.toLowerCase() !== link.repo.toLowerCase()) return update("invalid", "That run belongs to a different repository.");
  if (run.path !== WORKFLOW_PATH) return update("invalid", `The run didn't come from ${WORKFLOW_PATH}.`);
  if (link.sha && run.head_sha !== link.sha) return update("invalid", "The reported commit doesn't match the run.");

  const runInfo = { runId: String(run.id), runUrl: run.html_url, sha: run.head_sha };
  if (run.status !== "completed") return update("reported", "The run is still going. This page checks again by itself.", runInfo);

  // The file GitHub ran must be the one we generated for this connection
  const file = await getFileAt(link.repo, run.head_sha, WORKFLOW_PATH);
  if (!file.ok) return update(link.status, file.error, runInfo);
  const expected = workflowYaml({ origin: publicOrigin(), token: link.token, title: suite?.title ?? "" });
  if (!sameWorkflow(file.data, expected)) {
    return update("invalid", "The workflow file in the repo isn't the one pylearn gave you. Copy it again, unchanged.", runInfo);
  }

  if (run.conclusion === "success") {
    const passed = await update("passed", null, { ...runInfo, verifiedAt: new Date() });
    await onPassed(passed);
    return passed;
  }
  return update("failed", run.conclusion === "failure" ? "Some tests failed. The results are below." : `The run ended as "${run.conclusion}".`, runInfo);
}

/** A verified github lab is a verified lab: same XP and record as the other kinds */
async function onPassed(link: { userId: string; kind: string; targetId: string; report: unknown; runUrl: string | null }) {
  if (link.kind !== "lab") return;
  const run = await ensureLabRun(link.userId, link.targetId);
  const report = link.report as CiReport | null;
  await recordLabCheck(
    run.id,
    link.userId,
    { passed: true, notes: [`✓ GitHub Actions run passed${report ? ` (${report.passed} checks)` : ""}`] },
    link.runUrl ?? ""
  );
}

export { ciPassedProjectIds } from "@/lib/ci/passed";
