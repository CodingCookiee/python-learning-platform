/**
 * Certificates on the server (docs/superpowers/specs/2026-10-12-certificates-design.md): who can
 * claim one, issuing it once, and the holder's changes. Eligibility is checked here every time from
 * the rules that already exist; a certificate is never earned by a client's say-so. A learner who
 * later stops meeting a rule keeps a certificate already issued.
 */
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AUTOMATION_UNLOCK_AFTER, getCurriculumState, PYTHON_TRACK, type TrackProgress } from "@/lib/curriculum-state";
import { blackBeltIfDue, getBlackBeltStatus } from "@/lib/black-belt";
import {
  CERTIFICATE_TRACKS,
  newCertificateCode,
  validateName,
  type CertificateTrack,
} from "@/lib/certificate-rules";
import { automationComplete, automationLeft, blackBeltLeft } from "@/lib/certificate-eligibility";

export interface IssuedCertificate {
  code: string;
  track: CertificateTrack;
  name: string;
  issuedAt: Date;
  withdrawnAt: Date | null;
  /** Revoked by an admin: void, with no public page, and the holder can't restore it */
  revokedAt: Date | null;
}

export type CertificateState =
  | { track: CertificateTrack; state: "issued"; certificate: IssuedCertificate }
  | { track: CertificateTrack; state: "ready" }
  | { track: CertificateTrack; state: "not-yet"; left: string };

const SELECT = { code: true, track: true, name: true, issuedAt: true, withdrawnAt: true, revokedAt: true, userId: true } as const;

function issued(row: {
  code: string;
  track: string;
  name: string;
  issuedAt: Date;
  withdrawnAt: Date | null;
  revokedAt: Date | null;
}): IssuedCertificate {
  return {
    code: row.code,
    track: row.track as CertificateTrack,
    name: row.name,
    issuedAt: row.issuedAt,
    withdrawnAt: row.withdrawnAt,
    revokedAt: row.revokedAt,
  };
}

/** Whether the learner has earned this certificate now, and if not, what's left in a line */
export async function certificateEligibility(
  userId: string,
  track: CertificateTrack,
  tracks?: TrackProgress[]
): Promise<{ eligible: true } | { eligible: false; left: string }> {
  const state = tracks ?? (await getCurriculumState(userId));
  if (track === "automation") {
    const left = automationLeft(state);
    return automationComplete(state) ? { eligible: true } : { eligible: false, left: left ?? "Not yet." };
  }
  // Modules still to pass settle it without the black belt's topic and capstone checks (the slow part)
  const python = state.find((t) => t.slug === PYTHON_TRACK);
  const passed = python?.modules.filter((m) => m.passed).length ?? 0;
  const total = python?.modules.length ?? 0;
  if (total === 0) return { eligible: false, left: "The Python syllabus isn't published yet." };
  if (passed < total) {
    const left = blackBeltLeft({ met: false, checkpoints: { passed, total }, topics: [], topicsMet: 0, capstones: { approved: 0, needed: 0 } });
    return { eligible: false, left: left ?? "Not yet." };
  }
  const blackBelt = await getBlackBeltStatus(userId, state);
  const left = blackBeltLeft(blackBelt);
  return blackBelt.met ? { eligible: true } : { eligible: false, left: left ?? "Not yet." };
}

/** Both certificates for this learner: issued, ready to claim, or what's still to do */
export async function getCertificateStates(userId: string, tracks?: TrackProgress[]): Promise<CertificateState[]> {
  const [state, rows] = await Promise.all([
    tracks ? Promise.resolve(tracks) : getCurriculumState(userId),
    prisma.certificate.findMany({ where: { userId }, select: SELECT }),
  ]);
  return Promise.all(
    CERTIFICATE_TRACKS.map(async (track): Promise<CertificateState> => {
      const row = rows.find((r) => r.track === track);
      if (row) return { track, state: "issued", certificate: issued(row) };
      const check = await certificateEligibility(userId, track, state);
      return check.eligible ? { track, state: "ready" } : { track, state: "not-yet", left: check.left };
    })
  );
}

/**
 * A certificate ready to claim, for the dashboard's band. Free for almost everyone: neither can be
 * earned before Python module 14 (the automation track opens there), so below that nothing is loaded;
 * past it, the black belt is only checked once every Python module is passed (as the rank does).
 */
export async function claimableCertificate(userId: string, modulesPassed: number): Promise<CertificateTrack | null> {
  if (modulesPassed < AUTOMATION_UNLOCK_AFTER) return null;
  const tracks = await getCurriculumState(userId);
  const [blackBelt, held] = await Promise.all([
    blackBeltIfDue(userId, tracks),
    prisma.certificate.findMany({ where: { userId }, select: { track: true } }),
  ]);
  const has = new Set(held.map((h) => h.track));
  if (blackBelt?.met && !has.has("python")) return "python";
  if (automationComplete(tracks) && !has.has("automation")) return "automation";
  return null;
}

export type ClaimResult =
  | { ok: true; created: boolean; certificate: IssuedCertificate }
  | { ok: false; status: 400 | 403; error: string };

/** Issue the learner's certificate with the name they confirmed. Claiming again returns the one they have. */
export async function claimCertificate(userId: string, track: CertificateTrack, rawName: unknown): Promise<ClaimResult> {
  const existing = await prisma.certificate.findUnique({ where: { userId_track: { userId, track } }, select: SELECT });
  if (existing) return { ok: true, created: false, certificate: issued(existing) };

  const name = validateName(rawName);
  if (!name.ok) return { ok: false, status: 400, error: name.error };
  const check = await certificateEligibility(userId, track);
  if (!check.eligible) return { ok: false, status: 403, error: `Not earned yet. ${check.left}` };

  // A fresh random code; on the rare collision, another. A second claim racing this one finds the first
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await prisma.certificate.create({
        data: { userId, track, name: name.name, code: newCertificateCode(track) },
        select: SELECT,
      });
      return { ok: true, created: true, certificate: issued(row) };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const raced = await prisma.certificate.findUnique({ where: { userId_track: { userId, track } }, select: SELECT });
      if (raced) return { ok: true, created: false, certificate: issued(raced) };
    }
  }
  throw new Error("Couldn't find a free certificate code");
}

export type UpdateResult = { ok: true; certificate: IssuedCertificate } | { ok: false; status: 400 | 403 | 404; error: string };

/** The holder fixes the printed name, or withdraws (or restores) the public page */
export async function updateCertificate(
  userId: string,
  code: string,
  change: { name?: unknown; withdrawn?: unknown }
): Promise<UpdateResult> {
  const row = await prisma.certificate.findUnique({ where: { code }, select: SELECT });
  if (!row) return { ok: false, status: 404, error: "No certificate with that ID." };
  if (row.userId !== userId) return { ok: false, status: 403, error: "Only the holder can change this certificate." };
  if (row.revokedAt) return { ok: false, status: 403, error: "pylearn revoked this certificate, so it can't be changed." };

  const data: { name?: string; withdrawnAt?: Date | null } = {};
  if (change.name !== undefined) {
    const name = validateName(change.name);
    if (!name.ok) return { ok: false, status: 400, error: name.error };
    data.name = name.name;
  }
  if (change.withdrawn !== undefined) {
    if (typeof change.withdrawn !== "boolean") return { ok: false, status: 400, error: "Say whether to withdraw the page." };
    data.withdrawnAt = change.withdrawn ? (row.withdrawnAt ?? new Date()) : null;
  }
  if (Object.keys(data).length === 0) return { ok: false, status: 400, error: "Nothing to change." };
  const updated = await prisma.certificate.update({ where: { code }, data, select: SELECT });
  return { ok: true, certificate: issued(updated) };
}

/**
 * A certificate for its public page. A withdrawn one is shown to its holder only: anyone else gets
 * nothing, the same as for a code that doesn't exist, so the page never says whose it was. A revoked
 * one is gone for everyone.
 */
export async function getCertificateForViewer(
  code: string,
  viewerId: string | null
): Promise<{ certificate: IssuedCertificate; holder: boolean } | null> {
  const row = await prisma.certificate.findUnique({ where: { code }, select: SELECT });
  if (!row || row.revokedAt) return null;
  const holder = viewerId !== null && row.userId === viewerId;
  if (row.withdrawnAt && !holder) return null;
  return { certificate: issued(row), holder };
}
