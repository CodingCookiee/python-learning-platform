import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { parseRepo } from "@/lib/ci/github";
import { PYTEST_ARGS, REPORTER, runnerFiles, sameWorkflow, WORKFLOW_PATH, workflowYaml } from "@/lib/ci/workflow";

describe("repo URLs", () => {
  it.each([
    ["https://github.com/you/receipt", "you/receipt"],
    ["https://github.com/you/receipt.git", "you/receipt"],
    ["github.com/you/receipt/", "you/receipt"],
    ["https://github.com/you/receipt/tree/main/src", "you/receipt"],
    ["you/receipt", "you/receipt"],
  ])("reads %s", (input, repo) => {
    expect(parseRepo(input)).toBe(repo);
  });

  it.each(["not a repo", "https://gitlab.com/you/receipt", "you", "../../etc/passwd", "you/rec eipt"])("refuses %s", (input) => {
    expect(parseRepo(input)).toBeNull();
  });
});

describe("the generated workflow", () => {
  const yaml = workflowYaml({ origin: "https://pylearn.example", token: "0123456789", title: 'Receipt "printer" & co' });
  const parsed = parseYaml(yaml) as {
    on: Record<string, unknown>;
    permissions: Record<string, string>;
    jobs: { pylearn: { env: Record<string, unknown>; steps: Array<{ run?: string; uses?: string }> } };
  };

  it("is valid YAML that runs on push with read-only permissions", () => {
    expect(Object.keys(parsed.on)).toContain("push");
    expect(parsed.permissions).toEqual({ contents: "read" });
  });

  it("keeps the token a string, even one that looks like a number", () => {
    expect(parsed.jobs.pylearn.env.PYLEARN_TOKEN).toBe("0123456789");
    expect(parsed.jobs.pylearn.env.PYLEARN_URL).toBe("https://pylearn.example");
  });

  it("runs pytest with the shared arguments, so local checks match CI", () => {
    const run = parsed.jobs.pylearn.steps.map((s) => s.run ?? "").join("\n");
    expect(run).toContain(`python -m pytest ${PYTEST_ARGS.join(" ")}`);
    expect(PYTEST_ARGS).toContain("--noconftest");
  });

  it("strips characters that could break out of the YAML comment", () => {
    expect(yaml.split("\n")[0]).toBe('# pylearn: runs the tests for "Receipt printer & co" on every push and reports the result.');
  });

  it("compares workflows ignoring line endings and trailing space, and nothing else", () => {
    expect(sameWorkflow(yaml, yaml.replace(/\n/g, "\r\n") + "\n  ")).toBe(true);
    expect(sameWorkflow(yaml, yaml.replace("python -m pytest", "true || python -m pytest"))).toBe(false);
  });

  it("ships the runner files the workflow expects", () => {
    const files = runnerFiles();
    expect(files["pytest.ini"]).toContain("pythonpath = .");
    expect(files[REPORTER]).toContain("/api/ci/report/");
    expect(WORKFLOW_PATH).toBe(".github/workflows/pylearn.yml");
  });
});
