import { describe, expect, it } from "vitest";
import { passwordProblem } from "@/lib/validations/password";
import { displayName, signInSchema, signUpSchema } from "@/lib/validations/auth";

describe("the password policy (NIST SP 800-63B)", () => {
  it("accepts a long phrase with no symbols or capitals", () => {
    expect(passwordProblem("correct horse battery staple")).toBeNull();
    expect(passwordProblem("tea at four on the mat")).toBeNull();
  });

  it("judges length in characters, up to bcrypt's 72 bytes", () => {
    expect(passwordProblem("short7!")).toMatch(/at least 8/);
    expect(passwordProblem("a1b2c3d4".repeat(9))).toMatch(/64 characters or fewer/);
    // 20 four-byte emoji are 20 characters but 80 bytes
    expect(passwordProblem("🥋".repeat(20))).toMatch(/too long once encoded/);
  });

  it("refuses the most used passwords, decorated or not", () => {
    expect(passwordProblem("password")).toMatch(/most used/);
    expect(passwordProblem("Password2026!")).toMatch(/most used/);
    expect(passwordProblem("sunshine99")).toMatch(/most used/);
    expect(passwordProblem("pylearn123")).toMatch(/most used/);
  });

  it("refuses runs and repeats", () => {
    expect(passwordProblem("aaaaaaaa")).toMatch(/run/);
    expect(passwordProblem("abcdefgh")).toMatch(/run/);
    expect(passwordProblem("98765432")).toMatch(/run/);
    expect(passwordProblem("abababab")).toMatch(/run/);
  });

  it("refuses a password built from the account's own email or name", () => {
    const account = { email: "grace.hopper@example.invalid", name: "Grace Hopper" };
    expect(passwordProblem("grace.hopper-rocks", account)).toMatch(/email or name/);
    expect(passwordProblem("hopper-in-the-navy", account)).toMatch(/email or name/);
    expect(passwordProblem("compilers-before-coffee", account)).toBeNull();
  });
});

describe("the auth forms", () => {
  it("only asks sign-in for a password, never its length", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("checks a sign-up's password against its name and email", () => {
    const result = signUpSchema.safeParse({
      name: "Ada",
      email: "lovelace@example.invalid",
      password: "lovelace-engine",
      confirmPassword: "lovelace-engine",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("takes any name a person goes by, and nothing that isn't one", () => {
    for (const name of ["Ö", "J. R.", "李小龙", "Seán O'Brien-Ní Bhriain"]) {
      expect(displayName.safeParse(name).success, name).toBe(true);
    }
    expect(displayName.parse("  Ada   Lovelace ")).toBe("Ada Lovelace");
    for (const name of ["", "   ", "<script>", "Win at evil.com", "see https://x.y", "x".repeat(61)]) {
      expect(displayName.safeParse(name).success, name).toBe(false);
    }
  });
});
