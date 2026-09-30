import "dotenv/config";
import { writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";
import { consumeToken, issueToken } from "../lib/auth-tokens";

// Setup for the browser check of the email flows (and a token round trip)
let failures = 0;
function check(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
}

async function main() {
  const mode = process.argv[2] ?? "setup";
  const emails = ["m4-unverified@example.invalid", "m4-reset@example.invalid"];
  if (mode === "cleanup") {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.verificationToken.deleteMany({ where: { identifier: { in: emails.flatMap((e) => [`verify:${e}`, `reset:${e}`]) } } });
    console.log("cleaned");
    return;
  }

  // Token round trip
  const t = await issueToken("verify", "Someone@Example.invalid");
  const again = await issueToken("verify", "someone@example.invalid");
  check("a newer token voids the older one", (await consumeToken("verify", t)) === null);
  check("wrong kind is refused", (await consumeToken("reset", again)) === null);
  const again2 = await issueToken("verify", "someone@example.invalid");
  check("token gives back the (lowercased) email", (await consumeToken("verify", again2)) === "someone@example.invalid");
  check("a token works once", (await consumeToken("verify", again2)) === null);
  const stored = await prisma.verificationToken.findMany({ where: { identifier: "verify:someone@example.invalid" } });
  check("nothing left behind", stored.length === 0);

  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  const password = await hash("Unverified!2026", 12);
  await prisma.user.create({ data: { email: emails[0]!, name: "Unverified", password, emailVerified: null } });
  await prisma.user.create({ data: { email: emails[1]!, name: "Resetter", password, emailVerified: new Date() } });
  const verifyToken = await issueToken("verify", emails[0]!);
  const resetToken = await issueToken("reset", emails[1]!);
  writeFileSync(process.env.TEMP + "/m4-email-tokens.json", JSON.stringify({ verifyToken, resetToken }));
  console.log(failures === 0 ? "SETUP OK" : `${failures} FAILED`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
