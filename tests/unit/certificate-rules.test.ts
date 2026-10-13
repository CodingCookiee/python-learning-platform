import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  formatIssued,
  linkedInAddUrl,
  newCertificateCode,
  normaliseCode,
  validateName,
} from "@/lib/certificate-rules";
import { automationComplete, automationLeft, blackBeltLeft } from "@/lib/certificate-eligibility";
import type { TrackProgress } from "@/lib/curriculum-state";

describe("certificate codes", () => {
  it("carry the track's prefix and eight Crockford base32 characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(newCertificateCode("python")).toMatch(/^PL-PY-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
      expect(newCertificateCode("automation")).toMatch(/^PL-AI-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    }
  });

  it("never use the letters that read as digits", () => {
    expect(CODE_ALPHABET).toHaveLength(32);
    for (const letter of "ILOU") expect(CODE_ALPHABET).not.toContain(letter);
  });

  it("are read back from a URL in any case, and refuse anything else", () => {
    const code = newCertificateCode("python", () => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 31]));
    expect(code).toBe("PL-PY-0123-456Z");
    expect(normaliseCode("pl-py-0123-456z")).toBe("PL-PY-0123-456Z");
    expect(normaliseCode("PL-PY-0123-456I")).toBeNull();
    expect(normaliseCode("PL-XX-0123-4567")).toBeNull();
    expect(normaliseCode("../etc")).toBeNull();
  });
});

describe("the printed name", () => {
  it("is trimmed with single spaces", () => {
    expect(validateName("  Ada   Lovelace ")).toEqual({ ok: true, name: "Ada Lovelace" });
  });

  it("must be 2 to 80 characters", () => {
    expect(validateName("A").ok).toBe(false);
    expect(validateName("   ").ok).toBe(false);
    expect(validateName("x".repeat(80)).ok).toBe(true);
    expect(validateName("x".repeat(81)).ok).toBe(false);
    expect(validateName(42).ok).toBe(false);
  });

  it("keeps names in any script", () => {
    expect(validateName("Zoë Ünal-Ōtsuka").ok).toBe(true);
    expect(validateName("محمد علی").ok).toBe(true);
  });
});

describe("the LinkedIn link", () => {
  it("fills in the certification's name, issuer, month, URL and ID", () => {
    const url = new URL(
      linkedInAddUrl({ track: "python", code: "PL-PY-0123-456Z", issuedAt: new Date("2026-10-12T09:00:00Z") }, "https://pylearn.example/certificates/PL-PY-0123-456Z")
    );
    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      startTask: "CERTIFICATION_NAME",
      name: "Black belt in Python",
      organizationName: "pylearn",
      issueYear: "2026",
      issueMonth: "10",
      certUrl: "https://pylearn.example/certificates/PL-PY-0123-456Z",
      certId: "PL-PY-0123-456Z",
    });
  });

  it("prints the issue date in full", () => {
    expect(formatIssued(new Date("2026-10-12T23:30:00Z"))).toBe("12 October 2026");
  });
});

describe("eligibility from the curriculum", () => {
  const track = (slug: string, passed: number, total: number, unlocked = true) =>
    ({ slug, unlocked, modulesPassed: passed, modules: Array.from({ length: total }, () => ({})) }) as unknown as TrackProgress;

  it("needs every automation module passed", () => {
    expect(automationComplete([track("automation", 8, 8)])).toBe(true);
    expect(automationComplete([track("automation", 7, 8)])).toBe(false);
    expect(automationComplete([track("automation", 0, 0)])).toBe(false);
    expect(automationComplete([])).toBe(false);
  });

  it("says what's left in a line", () => {
    expect(automationLeft([track("automation", 0, 8, false)])).toBe("Opens after Python module 14.");
    expect(automationLeft([track("automation", 5, 8)])).toBe("Pass 3 more automation modules for the 9th dan.");
    expect(automationLeft([track("automation", 8, 8)])).toBeNull();
    const status = { met: false, checkpoints: { passed: 12, total: 16 }, topics: [1, 2], topicsMet: 2, capstones: { approved: 3, needed: 3 } };
    expect(blackBeltLeft(status)).toBe("Pass 4 more modules for the black belt.");
    expect(blackBeltLeft({ ...status, checkpoints: { passed: 16, total: 16 }, topicsMet: 1 })).toBe(
      "Hold 1 more advanced topic at 80% through review."
    );
    expect(blackBeltLeft({ ...status, checkpoints: { passed: 16, total: 16 }, capstones: { approved: 1, needed: 3 } })).toBe(
      "Have 2 more capstone projects approved."
    );
    expect(blackBeltLeft({ ...status, met: true })).toBeNull();
  });
});
