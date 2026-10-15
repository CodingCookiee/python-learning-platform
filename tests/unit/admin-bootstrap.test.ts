import { describe, expect, it } from "vitest";
import { promotesToAdmin } from "@/lib/admin/bootstrap";
import { normalizeEmail } from "@/lib/email-address";
import { adminLevel } from "@/lib/admin/levels";

const site = { bootstrapEmail: "owner@pylearn.example", adminExists: false };
const learner = { email: "owner@pylearn.example", verified: true, role: "LEARNER" };

describe("the bootstrap admin (security review C-1)", () => {
  it("promotes the verified bootstrap address while no admin exists", () => {
    expect(promotesToAdmin(learner, site)).toBe(true);
    // The address is compared normalised, as accounts now store it
    expect(promotesToAdmin({ ...learner, email: " Owner@PyLearn.example " }, site)).toBe(true);
  });

  it("never promotes an unverified address", () => {
    expect(promotesToAdmin({ ...learner, verified: false }, site)).toBe(false);
  });

  it("never promotes once an admin exists: more admins come from the Users page", () => {
    expect(promotesToAdmin(learner, { ...site, adminExists: true })).toBe(false);
  });

  it("ignores other addresses and a missing setting", () => {
    expect(promotesToAdmin({ ...learner, email: "owner@pylearn.example.evil" }, site)).toBe(false);
    expect(promotesToAdmin(learner, { ...site, bootstrapEmail: undefined })).toBe(false);
  });
});

describe("email addresses", () => {
  it("are trimmed and lower-cased", () => {
    expect(normalizeEmail("  Ada.Lovelace@Example.COM ")).toBe("ada.lovelace@example.com");
  });
});

describe("admin levels", () => {
  it("tell a super admin from an admin, and nobody else gets in", () => {
    expect(adminLevel("SUPER_ADMIN")).toBe("super");
    expect(adminLevel("ADMIN")).toBe("admin");
    expect(adminLevel("LEARNER")).toBeNull();
    expect(adminLevel("AUTHOR")).toBeNull();
    expect(adminLevel(undefined)).toBeNull();
  });

  it("make the first admin a super admin, never a second one", () => {
    expect(promotesToAdmin({ email: "owner@pylearn.example", verified: true, role: "SUPER_ADMIN" }, { bootstrapEmail: "owner@pylearn.example", adminExists: false })).toBe(false);
  });
});
