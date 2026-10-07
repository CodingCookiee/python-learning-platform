import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as register } from "@/app/api/auth/register/route";
import { saveOnboarding } from "@/lib/onboarding";
import { makeLearner } from "./helpers";

const created: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: created } } });
});

function signUp(body: Record<string, unknown>) {
  const email = `onramp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
  created.push(email);
  const request = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.9.${created.length}.1` },
    body: JSON.stringify({ name: "Ada Learner", email, password: "Correct-Horse-1", confirmPassword: "Correct-Horse-1", ...body }),
  });
  return { email, response: register(request) };
}

describe("signing up (16 and over)", () => {
  it("is refused without confirming the age, and creates no account", async () => {
    const { email, response } = signUp({});
    expect((await response).status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it("records when the age was confirmed", async () => {
    const { email, response } = signUp({ ageConfirmed: true });
    expect((await response).status).toBe(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.ageConfirmedAt).toBeInstanceOf(Date);
  });
});

describe("onboarding", () => {
  const answers = { experience: "new" as const, goal: "python" as const, weeklyHours: 5 };

  it("asks for the age when the account has none on record (GitHub or Google sign-ins)", async () => {
    const learner = await makeLearner("onboard-age", { ageConfirmedAt: null });
    try {
      const refused = await saveOnboarding(learner.user.id, answers);
      expect(refused).toMatchObject({ ok: false, status: 400 });
      const saved = await saveOnboarding(learner.user.id, { ...answers, ageConfirmed: true });
      expect(saved.ok).toBe(true);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: learner.user.id } });
      expect(user.ageConfirmedAt).toBeInstanceOf(Date);
      expect(user.onboardedAt).toBeInstanceOf(Date);
    } finally {
      await learner.cleanup();
    }
  });

  it("doesn't ask again once the age is on record", async () => {
    const learner = await makeLearner("onboard-known");
    try {
      expect((await saveOnboarding(learner.user.id, answers)).ok).toBe(true);
    } finally {
      await learner.cleanup();
    }
  });
});
