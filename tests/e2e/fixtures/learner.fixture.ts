import { test as base } from "@playwright/test";
import { SignInPage } from "../pages/sign-in.page";
import { DashboardPage, LogPage, ModulePage, ProfilePage } from "../pages/app.pages";
import { E2E_PASSWORD } from "../support/constants";
import {
  createLearner,
  deleteLearners,
  uniqueEmail,
  type LearnerKind,
} from "../support/seed-client";

interface Learner {
  email: string;
  password: string;
}

interface Fixtures {
  /** Makes a throwaway learner of this kind and signs in as them; deleted after the test */
  signInAs: (kind: LearnerKind) => Promise<Learner>;
  /** A throwaway learner, not signed in; deleted after the test */
  makeLearner: (kind: LearnerKind) => Learner;
  signInPage: SignInPage;
  dashboard: DashboardPage;
  profile: ProfilePage;
  modulePage: ModulePage;
  logPage: LogPage;
}

export const test = base.extend<Fixtures>({
  makeLearner: async ({}, provide, testInfo) => {
    const made: string[] = [];
    await provide((kind) => {
      const email = uniqueEmail(
        testInfo.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 24)
      );
      createLearner(email, kind);
      made.push(email);
      return { email, password: E2E_PASSWORD };
    });
    deleteLearners(...made);
  },
  signInAs: async ({ makeLearner, signInPage }, provide) => {
    await provide(async (kind) => {
      const learner = makeLearner(kind);
      await signInPage.signInAs(learner.email, learner.password);
      return learner;
    });
  },
  signInPage: async ({ page }, provide) => provide(new SignInPage(page)),
  dashboard: async ({ page }, provide) => provide(new DashboardPage(page)),
  profile: async ({ page }, provide) => provide(new ProfilePage(page)),
  modulePage: async ({ page }, provide) => provide(new ModulePage(page)),
  logPage: async ({ page }, provide) => provide(new LogPage(page)),
});

export { expect } from "@playwright/test";
