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

  test.describe("before the page's script has loaded", () => {
    test.use({ javaScriptEnabled: false });

    test("never puts the email or password in the address", async ({ page }) => {
      await page.goto("/auth/signin");
      await page.getByLabel("Email").fill("nobody@example.invalid");
      await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForLoadState("load");
      expect(page.url()).not.toContain("password");
      expect(page.url()).not.toContain("nobody");
      // An address that already carries them is sent somewhere clean
      await page.goto("/auth/signin?email=a%40b.c&password=secret");
      expect(new URL(page.url()).search).toBe("");
    });
  });
});
