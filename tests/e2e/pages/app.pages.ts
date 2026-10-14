import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page";

/** The dashboard: the next step, the belt, this week, and a link to the record */
export class DashboardPage extends BasePage {
  readonly thisWeek: Locator;
  readonly recordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.thisWeek = page.getByRole("region", { name: "This week" });
    this.recordLink = page.getByRole("link", { name: "your record" });
  }

  async goto(): Promise<void> {
    await this.navigate("/dashboard");
  }

  beltTestOutLink(belt: string): Locator {
    return this.thisWeek.getByRole("link", { name: `the whole ${belt} in one sitting` });
  }
}

/** The profile: the learner's record and certificates */
export class ProfilePage extends BasePage {
  readonly certificates: Locator;

  constructor(page: Page) {
    super(page);
    this.certificates = page.getByRole("region", { name: "Certificates" });
  }

  async goto(): Promise<void> {
    await this.navigate("/profile");
  }

  heading(name: string): Locator {
    return this.page.getByRole("heading", { level: 2, name });
  }

  /** Opens the claim dialog for the first certificate on offer, and issues it in this name */
  async claimCertificate(name: string): Promise<void> {
    await this.certificates.getByRole("button", { name: "Claim your certificate" }).click();
    const dialog = this.page.getByRole("dialog");
    await dialog.getByLabel("Name to print").fill(name);
    await dialog.getByRole("button", { name: "Issue my certificate" }).click();
  }
}

/** A module page: its own grading, and the belt test-out offered beside it */
export class ModulePage extends BasePage {
  readonly grading: Locator;

  constructor(page: Page) {
    super(page);
    this.grading = page.getByRole("region", { name: "Grading" });
  }

  async goto(moduleId: string): Promise<void> {
    await this.navigate(`/modules/${moduleId}`);
  }

  beltTestOut(belt: string): Locator {
    return this.page.getByRole("region", { name: `Already know the whole ${belt}?` });
  }

  /** Opens the start confirmation for the belt test-out and returns it */
  async openBeltTestOut(belt: string): Promise<Locator> {
    const offer = this.beltTestOut(belt);
    await offer.getByRole("button", { name: `Test out of the ${belt}` }).click();
    return offer.getByRole("group");
  }
}

/** The weekly check-in */
export class LogPage extends BasePage {
  readonly learned: Locator;
  readonly stuck: Locator;
  readonly built: Locator;

  constructor(page: Page) {
    super(page);
    this.learned = page.getByLabel("Learned");
    this.stuck = page.getByLabel("Stuck on");
    this.built = page.getByLabel("Built or finished");
  }

  async goto(): Promise<void> {
    await this.navigate("/log");
  }
}
