import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export abstract class BasePage {
  constructor(readonly page: Page) {}

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /** WCAG 2.2 AA violations on the page as it stands, as "rule (n): selectors" lines */
  async accessibilityViolations(): Promise<string[]> {
    const result = await new AxeBuilder({ page: this.page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    return result.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")}`);
  }
}
