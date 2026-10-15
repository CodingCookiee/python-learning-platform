import { expect, test } from "../fixtures/learner.fixture";

test.describe("The dashboard", () => {
  test("keeps to the next step and this week, and links to the record", async ({ signInAs, dashboard, profile, page }) => {
    await signInAs("developer");

    for (const kept of ["This week", "Your current belt"]) {
      await expect(page.getByRole("heading", { level: 2, name: kept })).toBeVisible();
    }
    // The record moved to the profile
    for (const moved of ["Training log", "Recent achievements", "Skill map", "Recently finished"]) {
      await expect(page.getByRole("heading", { level: 2, name: moved })).toHaveCount(0);
    }
    expect(await dashboard.accessibilityViolations()).toEqual([]);

    await dashboard.recordLink.click();
    await expect(page).toHaveURL(/\/profile#record-heading$/);
    // It lands on the record, not the top of the profile
    await expect(profile.heading("Training record")).toBeInViewport({ timeout: 60_000 });
    for (const heading of ["Training record", "Training log", "Skill map", "Recent achievements", "Recently finished"]) {
      await expect(profile.heading(heading)).toBeVisible();
    }
  });

  test("offers a developer the whole belt in one sitting", async ({ signInAs, dashboard, page }) => {
    await signInAs("developer");
    await expect(dashboard.thisWeek.getByRole("link", { name: "Test out with its grading" })).toBeVisible();
    await dashboard.beltTestOutLink("white belt").click();
    await expect(page).toHaveURL(/\/modules\/[^/]+#belt-test-out-heading$/);
    await expect(page.getByRole("heading", { name: "Already know the whole white belt?" })).toBeInViewport();
  });
});
