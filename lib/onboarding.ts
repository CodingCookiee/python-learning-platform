import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** The first-run answers, and later changes to the plan */
export const onboardingSchema = z.object({
  experience: z.enum(["new", "other-language", "python"]),
  goal: z.enum(["python", "automation"]),
  weeklyHours: z.number().int().min(1).max(40),
  /** Asked only when the account has no age on record (GitHub or Google sign-ins) */
  ageConfirmed: z.literal(true).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export type OnboardingResult = { ok: true } | { ok: false; status: 400 | 404; error: string };

export async function saveOnboarding(userId: string, input: unknown): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Answer all three questions." };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { onboardedAt: true, ageConfirmedAt: true } });
  if (!user) return { ok: false, status: 404, error: "Account not found." };
  const { ageConfirmed, ...answers } = parsed.data;
  // pylearn is for people 16 and over; sign-up asks, other sign-ins are asked here
  if (!user.ageConfirmedAt && !ageConfirmed) {
    return { ok: false, status: 400, error: "pylearn is for people 16 and over. Confirm your age to continue." };
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...answers,
      onboardedAt: user.onboardedAt ?? new Date(),
      ageConfirmedAt: user.ageConfirmedAt ?? new Date(),
    },
  });
  return { ok: true };
}
