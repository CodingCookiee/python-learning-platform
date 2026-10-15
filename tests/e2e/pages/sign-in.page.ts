import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class SignInPage extends BasePage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    super(page);
    this.email = page.getByLabel("Email");
    this.password = page.getByLabel("Password", { exact: true });
    this.submit = page.getByRole("button", { name: "Sign in", exact: true });
    // In the page, not Next's route announcer (also an alert)
    this.error = page.getByRole("main").getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.navigate("/auth/signin");
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  /** Signs in and waits for the dashboard */
  async signInAs(email: string, password: string): Promise<void> {
    await this.goto();
    await this.signIn(email, password);
    await expect(this.page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
    // Past the loading screen: the remote dev database can take a while on a first render
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
  }
}
