import { z } from "zod";
import { newPasswordField, refineAgainstAccount } from "@/lib/validations/password";

/**
 * Validation schemas for authentication forms. The rules follow NIST SP 800-63B and OWASP:
 * passwords are judged on length and guessability, never on character mixes
 * (lib/validations/password.ts); names are anything a person is called, with no links or markup.
 */

/** An email field, trimmed and lower-cased before it's checked or stored (lib/email-address.ts) */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("That doesn't look like an email address.");

/**
 * A display name: one character or many (mononyms and initials are names too), any script, at
 * most 60. No links or markup, because the name is shown to admins and written into emails.
 */
export const displayName = z
  .string()
  .transform((value) => value.normalize("NFC").replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1, "Tell us what to call you.")
      .max(60, "Keep your name to 60 characters or fewer.")
      // Control characters never belong in a name
      .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "Use letters, spaces and punctuation only.")
      .refine((v) => !/[<>{}\\]/.test(v), "Use letters, spaces and punctuation only.")
      .refine(
        (v) => !/(https?:|www\.|\.(com|net|org|io|ru|xyz|top|info|biz|link|click)\b)/i.test(v),
        "A name can't contain a link."
      )
  );

/** Sign-in only asks for a password: the length rules are for choosing one, not typing it */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    name: displayName,
    email,
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword)
      ctx.addIssue({ code: "custom", message: "The passwords don't match.", path: ["confirmPassword"] });
    refineAgainstAccount(data, ctx);
  });

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "The passwords don't match.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
