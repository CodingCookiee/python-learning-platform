import { describe, expect, it } from "vitest";
import { passwordResetEmail, verificationEmail } from "@/lib/email-templates";
import { checkFields, checkOutput, probeUrl } from "@/lib/labs";
import { rateLimit } from "@/lib/rate-limit";
import { loadContent } from "@/lib/content/load";
import { labSpecSchema } from "@/lib/content/schema";

describe("emails", () => {
  it("escape the link and keep a plain-text version", () => {
    const e = verificationEmail('https://pylearn.example/auth/verify-email?token=a"><script>');
    expect(e.subject).toBe("Confirm your pylearn email");
    expect(e.html).not.toContain('"><script>');
    expect(e.html).toContain("&quot;&gt;&lt;script&gt;");
    expect(e.text).toContain("Confirm my email: https://pylearn.example/auth/verify-email?token=");
  });

  it("say how long a reset link lasts", () => {
    const e = passwordResetEmail("https://pylearn.example/auth/reset-password?token=t");
    expect(e.text).toContain("works once, for one hour");
  });
});

describe("lab checks", () => {
  const webhook = labSpecSchema.parse({
    title: "Lead intake",
    kind: "webhook",
    instructions: "Post the lead.",
    expect: { "data.email": "amira@example.com", score: 100, priority: "high" },
  });

  it("match expected fields by dot path, numbers as numbers or strings", () => {
    const ok = checkFields(webhook, { data: { email: " amira@example.com " }, score: "100", priority: "high" });
    expect(ok.passed).toBe(true);
    const bad = checkFields(webhook, { data: { email: "x@y.z" }, score: 99 });
    expect(bad.passed).toBe(false);
    expect(bad.notes.filter((n) => n.startsWith("✗"))).toHaveLength(3);
  });

  it("match pasted output against every pattern", () => {
    const spec = labSpecSchema.parse({ title: "t", kind: "output", instructions: "i", patterns: ["^All checks passed!", "\\d+ passed"] });
    expect(checkOutput(spec, "All checks passed!\n12 passed in 0.3s").passed).toBe(true);
    expect(checkOutput(spec, "Found 2 errors\n12 passed").passed).toBe(false);
  });

  it("refuse to probe anything but public https", async () => {
    const spec = labSpecSchema.parse({ title: "t", kind: "url", instructions: "i", path: "/health" });
    for (const url of ["http://example.com", "https://127.0.0.1", "https://localhost", "https://user:pw@example.com"]) {
      const { check } = await probeUrl(spec, url);
      expect(check.passed, url).toBe(false);
    }
  });

  it("are validated: each kind needs what it checks", () => {
    expect(() => labSpecSchema.parse({ title: "t", kind: "webhook", instructions: "i" })).toThrow();
    expect(() => labSpecSchema.parse({ title: "t", kind: "output", instructions: "i" })).toThrow();
    expect(() => labSpecSchema.parse({ title: "t", kind: "output", instructions: "i", patterns: ["(unclosed"] })).toThrow();
    expect(labSpecSchema.parse({ title: "t", kind: "github", instructions: "i" }).requirements).toEqual([]);
  });
});

describe("rate limits without Redis", () => {
  it("count per name and subject, and block past the limit", async () => {
    const who = `unit-${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit("emailSend", who));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect((await rateLimit("emailSend", `${who}-other`)).ok).toBe(true);
  });
});

describe("the content tree", () => {
  it("loads with no errors", () => {
    const { tracks, issues } = loadContent();
    const errors = issues.filter((i) => i.level === "error");
    expect(errors, errors.map((e) => `${e.path}: ${e.message}`).join("\n")).toHaveLength(0);
    // The Start on-ramp (no grade) comes first, then the 16 Python and 8 automation modules
    expect(tracks.map((t) => t.slug)).toEqual(["start", "python", "automation"]);
    expect(tracks.flatMap((t) => t.modules)).toHaveLength(25);
    expect(tracks[0]!.grade).toBe("none");
    // Reads every file in content/ (thousands): seconds on Windows, where each read is scanned
  }, 60_000);
});
