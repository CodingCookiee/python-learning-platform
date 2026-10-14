import { expect, test } from "../fixtures/learner.fixture";
import { pythonModule } from "../support/seed-client";

/** An Etc/GMT zone where it's about 11:15 PM right now, so a two-hour grading would end after midnight */
function lateEveningZone(): string {
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const offset = Math.round(23.25 - utcHours + 24) % 24;
  // Etc/GMT signs are inverted: Etc/GMT-5 is UTC+5
  return offset === 0 ? "Etc/GMT" : offset <= 12 ? `Etc/GMT-${offset}` : `Etc/GMT+${24 - offset}`;
}

test.describe("The belt test-out", () => {
  test("is offered on every module page of the belt, with its terms", async ({ signInAs, modulePage }) => {
    await signInAs("developer");
    // Module 3 is still locked, and offers the same test-out
    await modulePage.goto(pythonModule(3).id);
    const offer = modulePage.beltTestOut("white belt");
    await expect(offer).toContainText("Test out of modules 1 to 3 in one sitting instead of 3 separate gradings");
    await expect(offer).toContainText("6 drills, two from each module, 120 minutes, 80% to pass");
    // Not offered for a belt the learner hasn't reached
    await modulePage.goto(pythonModule(4).id);
    await expect(modulePage.beltTestOut("yellow belt")).toHaveCount(0);
  });

  test("asks before the clock starts, and says when it would end", async ({ signInAs, modulePage }) => {
    await signInAs("developer");
    await modulePage.goto(pythonModule(1).id);
    const confirm = await modulePage.openBeltTestOut("white belt");
    await expect(confirm).toContainText("6 drills · 120 minutes · 80% to pass");
    await expect(confirm).toContainText(/started now, it ends at \d{1,2}:\d{2}/);
    await expect(confirm.getByRole("button", { name: "Start the clock" })).toBeFocused();
    expect(await modulePage.accessibilityViolations()).toEqual([]);

    await confirm.getByRole("button", { name: "Not now" }).click();
    await expect(confirm).toBeHidden();
  });

  test.describe("late in the evening", () => {
    test.use({ timezoneId: lateEveningZone() });

    test("warns that the grading runs into the night", async ({ signInAs, modulePage }) => {
      await signInAs("developer");
      await modulePage.goto(pythonModule(1).id);
      const confirm = await modulePage.openBeltTestOut("white belt");
      await expect(confirm).toContainText("That runs late into the night");
    });
  });

  test("starts one grading for the belt, apart from each module's own", async ({ signInAs, modulePage, page }) => {
    await signInAs("developer");
    const m1 = pythonModule(1);
    await modulePage.goto(m1.id);
    const confirm = await modulePage.openBeltTestOut("white belt");
    await confirm.getByRole("button", { name: "Start the clock" }).click();

    await expect(page).toHaveURL(/\/checkpoints\/[^/]+$/, { timeout: 60_000 });
    await expect(page).toHaveTitle(/Test-out: White belt/);
    await expect(page.getByRole("heading", { level: 1, name: "White belt" })).toBeVisible();
    await expect(page.getByText("Belt test-out · modules 1 to 3")).toBeVisible();
    await expect(page.getByText(/Pass 5 of these 6 drills to pass all 3 modules/)).toBeVisible();
    await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(6);

    // Module 1's own grading is untouched; the belt offer turns into a resume link
    await modulePage.goto(m1.id);
    await expect(modulePage.grading.getByRole("button", { name: "Test out" })).toBeVisible();
    await expect(modulePage.beltTestOut("white belt").getByRole("link", { name: "Resume the test-out" })).toBeVisible();
  });
});
