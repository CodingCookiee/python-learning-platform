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

  test("says why when a page sends a signed-out learner here, and goes back there after", async ({ makeLearner, signInPage, page }) => {
    const learner = makeLearner("developer");
    await page.goto("/review");
    await expect(page).toHaveURL(/\/auth\/signin\?callbackUrl=%2Freview/);
    await expect(page.getByRole("status").filter({ hasText: "You're signed out" })).toHaveText(
      "You're signed out. Sign in to carry on where you were going."
    );
    await signInPage.signIn(learner.email, learner.password);
    await expect(page).toHaveURL(/\/review$/, { timeout: 60_000 });
  });

  test("says the session ended when its cookie can't be read, and clears it", async ({ page, context, baseURL }) => {
    // Like a cookie another app on localhost wrote under the same name, or an expired one
    await context.addCookies([{ name: "authjs.session-token", value: "not-a-session", url: baseURL! }]);
    await page.goto("/review");
    await expect(page).toHaveURL(/ended=1/);
    await expect(page.getByRole("status").filter({ hasText: "session ended" })).toHaveText(
      "Your session ended, so you were signed out. Sign in again to carry on where you were."
    );
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "authjs.session-token")).toBeUndefined();
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
