import { describe, expect, it } from "vitest";
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  TOO_BIG_FILE,
  TOO_BIG_TOTAL,
  TOO_MANY_FILES,
  base64Bytes,
  uploadProblem,
} from "@/lib/capstone-upload";

const fileOf = (bytes: number) => ({ content: Buffer.alloc(bytes, 7).toString("base64") });

describe("capstone upload sizes", () => {
  it("measures a file by what its base64 decodes to, not by what the browser declared", () => {
    for (const n of [0, 1, 2, 3, 4, 1000, 999_999]) {
      expect(base64Bytes(Buffer.alloc(n, 7).toString("base64"))).toBe(n);
    }
  });

  it("keeps the most a learner can send under Vercel's 4.5 MB request cap once it's base64 in JSON", () => {
    const onTheWire = Math.ceil(MAX_TOTAL_BYTES / 3) * 4;
    expect(onTheWire).toBeLessThan(4_500_000 - 100_000);
  });

  it("accepts files that fit, and names the limit a set breaks", () => {
    expect(uploadProblem([fileOf(900_000), fileOf(900_000), fileOf(900_000)])).toBeNull();
    expect(uploadProblem([fileOf(1_000_001)])).toBe(TOO_BIG_FILE);
    expect(uploadProblem([fileOf(900_000), fileOf(900_000), fileOf(900_000), fileOf(400_000)])).toBe(TOO_BIG_TOTAL);
    expect(uploadProblem(Array.from({ length: MAX_FILES + 1 }, () => fileOf(1)))).toBe(TOO_MANY_FILES);
  });
});
