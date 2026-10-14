import { expect, test } from "../fixtures/learner.fixture";

test.describe("The weekly check-in", () => {
  test("drafts the facts and leaves what was learned to the learner", async ({ signInAs, logPage, page }) => {
    await signInAs("developer");
    await logPage.goto();

    await expect(logPage.built).toHaveValue(/1 drill passed/);
    await expect(logPage.learned).toHaveValue("");
    await expect(logPage.stuck).toHaveValue("");
    // The week's drill topics are offered as a prompt beside "Learned", tied to the field
    const prompt = page.getByText(/^Your drills this week covered .+\. What idea from them would you explain to someone else\?$/);
    await expect(prompt).toBeVisible();
    await expect(logPage.learned).toHaveAttribute("aria-describedby", /log-learned-prompt/);
    expect(await logPage.accessibilityViolations()).toEqual([]);
  });
});
