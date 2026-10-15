import { expect, test } from "../fixtures/learner.fixture";

test.describe("The Sensei", () => {
  test("opens on any page and asks for a key when there's none", async ({ signInAs, page }) => {
    await signInAs("developer");
    await page.getByRole("button", { name: "Ask the Sensei" }).click();
    const panel = page.getByRole("region", { name: "Ask the Sensei" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: "Add a key in Settings" })).toBeVisible();
    // Escape closes it and returns focus to the button
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(page.getByRole("button", { name: "Ask the Sensei" })).toBeFocused();
  });

  test("stands aside on drills, pointing to the tutor", async ({ signInAs, page }) => {
    await signInAs("developer");
    await page.goto("/modules");
    // Any drill: the first one linked from the first lesson
    await page.getByRole("link", { name: /Python for developers/ }).first().click();
    await page.getByRole("link", { name: /Running Python/ }).first().click();
    await page.locator('a[href^="/exercises/"]').first().click();
    await expect(page).toHaveURL(/\/exercises\//);

    const sensei = page.getByRole("button", { name: /The Sensei is unavailable here/ });
    await expect(sensei).toHaveAttribute("aria-disabled", "true");
    await sensei.hover();
    await expect(page.getByRole("tooltip")).toContainText("ask the tutor beside your code");
  });
});
