import { describe, expect, it } from "vitest";
import { combinedSource, decodeDraft, encodeDraft, filesForRun, parseDrillFiles } from "@/lib/drill-files";

const defs = parseDrillFiles([
  { path: "pricing.py", editable: true, starter: "STARTER", solution: "SOLUTION" },
  { path: "data.csv", editable: false, starter: "a,b\n" },
  { path: 42 },
  "nonsense",
]);

describe("multi-file drills", () => {
  it("parses only well-formed file definitions", () => {
    expect(defs.map((d) => d.path)).toEqual(["pricing.py", "data.csv"]);
    expect(defs[1]!.solution).toBe("a,b\n");
  });

  it("runs editable files as the learner has them, falling back to the starter", () => {
    expect(filesForRun(defs, { "pricing.py": "MINE" })).toEqual({ "pricing.py": "MINE", "data.csv": "a,b\n" });
    expect(filesForRun(defs, {})).toEqual({ "pricing.py": "STARTER", "data.csv": "a,b\n" });
  });

  it("never lets the browser change a read-only file", () => {
    expect(filesForRun(defs, { "data.csv": "tampered" })!["data.csv"]).toBe("a,b\n");
  });

  it("has no files for a single-file drill", () => {
    expect(filesForRun([], { x: "y" })).toBeUndefined();
  });

  it("stores every file in one text under headers", () => {
    const text = combinedSource("main.py", "print(1)\n", { "pricing.py": "X = 1\n" });
    expect(text).toBe("# ==== main.py ====\nprint(1)\n\n# ==== pricing.py ====\nX = 1\n");
    expect(combinedSource("solution.py", "only", undefined)).toBe("only");
  });

  it("round-trips multi-file drafts and leaves single-file drafts as plain code", () => {
    const encoded = encodeDraft("main", { "a.py": "A" });
    expect(decodeDraft(encoded)).toEqual({ main: "main", files: { "a.py": "A" } });
    expect(encodeDraft("just code")).toBe("just code");
    expect(decodeDraft("just code")).toBeNull();
    expect(decodeDraft('{"__multi": broken')).toBeNull();
  });
});
