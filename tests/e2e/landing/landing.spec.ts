import { expect, test } from "@playwright/test";
import { BasePage } from "../pages/base.page";

class LandingPage extends BasePage {
  readonly automation = this.page.getByRole("article").filter({ has: this.page.getByRole("heading", { name: "AI automation" }) });
}

test.describe("The landing page, signed out", () => {
  test("folds the automation modules until asked", async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.navigate("/");
    await expect(landing.automation).toContainText("Opens once you pass Python module 14");
    await expect(landing.automation).not.toContainText("In preparation");

    const modules = landing.automation.getByRole("listitem");
    await expect(modules.first()).toBeHidden();
    await landing.automation.getByText("See the modules").click();
    await expect(modules).toHaveCount(8);
    await expect(modules.first()).toBeVisible();
    await expect(modules.first()).toContainText("2nd dan");
    expect(await landing.accessibilityViolations()).toEqual([]);
  });

  test("works on a phone @phone", async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.navigate("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // No sideways scrolling
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await landing.accessibilityViolations()).toEqual([]);
  });
});
