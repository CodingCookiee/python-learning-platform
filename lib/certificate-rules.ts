/**
 * Certificates' fixed rules, with no database (docs/superpowers/specs/2026-10-12-certificates-design.md):
 * what each certificate says, its ID code, the printed name's limits, and the LinkedIn link. Safe in
 * the browser (the claim dialog's preview uses it). Eligibility is in lib/certificate-eligibility.ts,
 * claiming in lib/certificates.ts.
 */
export const CERTIFICATE_TRACKS = ["python", "automation"] as const;
export type CertificateTrack = (typeof CERTIFICATE_TRACKS)[number];

export interface CertificateWording {
  /** The ID's prefix */
  prefix: string;
  /** The certificate's own title, the line at the top */
  title: string;
  /** The rank numeral, set at poster scale */
  rank: { numeral: string; suffix: string };
  /** What was verified, after the holder's name */
  statement: string;
  /** The seal's lower line, under "Certified" */
  seal: string;
  /** How it's named elsewhere: on LinkedIn, in the page title */
  name: string;
}

export const CERTIFICATE: Record<CertificateTrack, CertificateWording> = {
  python: {
    prefix: "PL-PY",
    title: "Black belt in Python",
    rank: { numeral: "1st", suffix: "dan" },
    statement:
      "passed all 16 modules of the Python syllabus, held the advanced topics through spaced review, and had three capstone projects approved",
    seal: "Python",
    name: "Black belt in Python",
  },
  automation: {
    prefix: "PL-AI",
    title: "AI automation, 9th dan",
    rank: { numeral: "9th", suffix: "dan" },
    statement:
      "passed all eight modules of the AI automation track, from workflows and LLM APIs to agents, MCP servers and production systems",
    seal: "AI automation",
    name: "AI automation, 9th dan",
  },
};

export function isCertificateTrack(value: unknown): value is CertificateTrack {
  return typeof value === "string" && (CERTIFICATE_TRACKS as readonly string[]).includes(value);
}

// The ID code

/** Crockford's base32: no I, L, O or U, so a code read aloud or retyped can't be misread */
export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** A fresh, random ID for a certificate on this track: PL-PY-7K2M-9QXD */
export function newCertificateCode(track: CertificateTrack, random: (n: number) => Uint8Array = randomBytes): string {
  const bytes = random(8);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${CERTIFICATE[track].prefix}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

const CODE_PATTERN = new RegExp(`^PL-(PY|AI)-[${CODE_ALPHABET}]{4}-[${CODE_ALPHABET}]{4}$`);

/** A code from a URL, as stored (upper case), or null when it can't be one */
export function normaliseCode(raw: string): string | null {
  const code = decodeURIComponent(raw).trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

// The printed name

export const NAME_MIN = 2;
export const NAME_MAX = 80;

/** The name to print, tidied (trimmed, single spaces), or why it can't be printed */
export function validateName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Enter the name to print." };
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (/[\u0000-\u001f\u007f]/.test(name)) return { ok: false, error: "The name has characters that can't be printed." };
  if (name.length < NAME_MIN) return { ok: false, error: `Enter the name to print: at least ${NAME_MIN} characters.` };
  if (name.length > NAME_MAX) return { ok: false, error: `That's longer than ${NAME_MAX} characters. Shorten it to fit the certificate.` };
  return { ok: true, name };
}

// Sharing

/** LinkedIn's add-to-profile link for a certification, with everything filled in */
export function linkedInAddUrl(cert: { track: CertificateTrack; code: string; issuedAt: Date }, pageUrl: string): string {
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: CERTIFICATE[cert.track].name,
    organizationName: "pylearn",
    issueYear: String(cert.issuedAt.getUTCFullYear()),
    issueMonth: String(cert.issuedAt.getUTCMonth() + 1),
    certUrl: pageUrl,
    certId: cert.code,
  });
  return `https://www.linkedin.com/profile/add?${params}`;
}

/** The issue date as printed: 12 October 2026 */
export function formatIssued(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
