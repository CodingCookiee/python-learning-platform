import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * AES-256-GCM for secrets at rest (learners' AI keys). ENCRYPTION_KEY is 32 bytes,
 * base64 or hex (openssl rand -base64 32). Each value gets a fresh 12-byte IV, and
 * the associated data (the owner's user id) binds a ciphertext to its row, so a
 * value copied onto another user fails to decrypt.
 *
 * Stored format: "v1:" + base64(iv | tag | ciphertext)
 */

const VERSION = "v1";

function key(): Buffer {
  const raw = env().ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY isn't set; see .env.example");
  const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes (openssl rand -base64 32)");
  return buf;
}

export function isEncryptionConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string, associatedData: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")}`;
}

export function decryptSecret(stored: string, associatedData: string): string {
  const [version, payload] = stored.split(":", 2);
  if (version !== VERSION || !payload) throw new Error("Unrecognised secret format");
  const raw = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}
