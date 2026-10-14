import { expect, test } from "../fixtures/learner.fixture";

test.describe("Signing in", () => {
  test("takes a learner to their dashboard", async ({ makeLearner, signInPage, page }) => {
    const learner = makeLearner("developer");
    await signInPage.goto();
    await signInPage.signIn(learner.email, learner.password);
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 1, name: /Welcome back, Grace/ })).toBeVisible();
  });

  test("says so when the password is wrong, and stays on the form", async ({ makeLearner, signInPage, page }) => {
    const learner = makeLearner("developer");
    await signInPage.goto();
    await signInPage.signIn(learner.email, "not-the-password");
    await expect(signInPage.error).toHaveText("That email and password don't match. Check them and try again.");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
