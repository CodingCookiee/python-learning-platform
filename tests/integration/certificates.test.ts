import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { claimCertificate, getCertificateForViewer, getCertificateStates, updateCertificate } from "@/lib/certificates";
import { makeLearner, passAllPython } from "./helpers";

/** Pass every AI automation module's checkpoint as a placement test: the 9th dan */
async function passAllAutomation(userId: string) {
  const modules = await prisma.module.findMany({ where: { archivedAt: null, track: { slug: "automation" } }, select: { id: true } });
  await prisma.checkpointAttempt.createMany({
    data: modules.map((m) => ({ userId, moduleId: m.id, exerciseIds: [], passedIds: [], placement: true, score: 1, passed: true, submittedAt: new Date() })),
  });
}

let newcomer: Awaited<ReturnType<typeof makeLearner>>;
let graduate: Awaited<ReturnType<typeof makeLearner>>;
let stranger: Awaited<ReturnType<typeof makeLearner>>;

beforeAll(async () => {
  [newcomer, graduate, stranger] = await Promise.all([makeLearner("cert-new"), makeLearner("cert-grad"), makeLearner("cert-stranger")]);
  // Every module of both tracks passed; no capstones, so not the black belt
  await passAllPython(graduate.user.id);
  await passAllAutomation(graduate.user.id);
});
afterAll(() => Promise.all([newcomer.cleanup(), graduate.cleanup(), stranger.cleanup()]));

describe("claiming a certificate", () => {
  it("refuses a learner who hasn't earned it, and says what's left", async () => {
    const result = await claimCertificate(newcomer.user.id, "automation", "New Learner");
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(!result.ok && result.error).toMatch(/^Not earned yet\. Opens after Python module 14\./);
    // Every Python module passed isn't the black belt without the capstones
    expect(await claimCertificate(graduate.user.id, "python", "Grad Learner")).toMatchObject({ ok: false, status: 403 });
  });

  it("refuses a name it can't print", async () => {
    expect(await claimCertificate(graduate.user.id, "automation", " ")).toMatchObject({ ok: false, status: 400 });
  });

  it("issues the certificate once: a second claim returns the same one", async () => {
    const first = await claimCertificate(graduate.user.id, "automation", "  Grace   Hopper ");
    expect(first).toMatchObject({ ok: true, created: true, certificate: { track: "automation", name: "Grace Hopper" } });
    const code = first.ok ? first.certificate.code : "";
    expect(code).toMatch(/^PL-AI-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);

    const again = await claimCertificate(graduate.user.id, "automation", "Someone Else");
    expect(again).toMatchObject({ ok: true, created: false, certificate: { code, name: "Grace Hopper" } });
    expect(await prisma.certificate.count({ where: { userId: graduate.user.id } })).toBe(1);

    const states = await getCertificateStates(graduate.user.id);
    expect(states.map((s) => s.state)).toEqual(["not-yet", "issued"]);
  });
});

describe("the holder's changes and the public page", () => {
  it("lets only the holder change the name or withdraw the page", async () => {
    const cert = await prisma.certificate.findFirstOrThrow({ where: { userId: graduate.user.id } });
    expect(await updateCertificate(stranger.user.id, cert.code, { name: "Not Me" })).toMatchObject({ ok: false, status: 403 });
    expect(await updateCertificate(stranger.user.id, cert.code, { withdrawn: true })).toMatchObject({ ok: false, status: 403 });
    expect(await updateCertificate(graduate.user.id, "PL-AI-0000-0000", { withdrawn: true })).toMatchObject({ ok: false, status: 404 });

    expect(await updateCertificate(graduate.user.id, cert.code, { name: "Grace Brewster Hopper" })).toMatchObject({
      ok: true,
      certificate: { name: "Grace Brewster Hopper" },
    });
    expect(await updateCertificate(graduate.user.id, cert.code, {})).toMatchObject({ ok: false, status: 400 });
  });

  it("hides a withdrawn certificate from everyone but its holder, until it's restored", async () => {
    const cert = await prisma.certificate.findFirstOrThrow({ where: { userId: graduate.user.id } });
    expect(await getCertificateForViewer(cert.code, null)).toMatchObject({ holder: false, certificate: { name: "Grace Brewster Hopper" } });

    await updateCertificate(graduate.user.id, cert.code, { withdrawn: true });
    // Signed out, or someone else: nothing at all, as for a code that doesn't exist
    expect(await getCertificateForViewer(cert.code, null)).toBeNull();
    expect(await getCertificateForViewer(cert.code, stranger.user.id)).toBeNull();
    // The holder still sees it, to restore it
    expect(await getCertificateForViewer(cert.code, graduate.user.id)).toMatchObject({ holder: true });

    await updateCertificate(graduate.user.id, cert.code, { withdrawn: false });
    expect(await getCertificateForViewer(cert.code, null)).toMatchObject({ holder: false });
  });
});
