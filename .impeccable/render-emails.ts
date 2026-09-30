import { writeFileSync } from "node:fs";
import { passwordResetEmail, verificationEmail } from "../lib/email-templates";
const out = process.argv[2]!;
writeFileSync(`${out}/email-verify.html`, verificationEmail("http://localhost:3000/auth/verify-email?token=Zx8Qm2pLr4Kd7Tn1Vb6Yc3Hs9Wj5Fg0A").html);
writeFileSync(`${out}/email-reset.html`, passwordResetEmail("http://localhost:3000/auth/reset-password?token=Zx8Qm2pLr4Kd7Tn1Vb6Yc3Hs9Wj5Fg0A").html);
console.log("rendered");
