import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/learner.fixture";
import { drillId } from "../support/seed-client";

/** The drill's editor, through the Monaco API the page loads (the first editor is the learner's code) */
function editorState(page: Page) {
  return page.evaluate(() => {
    const editor = (window as unknown as { monaco: typeof import("monaco-editor") }).monaco.editor.getEditors()[0]!;
    const at = editor.getPosition()!;
    return { value: editor.getValue(), line: at.lineNumber, column: at.column };
  });
}

test.describe("The drill editor", () => {
  test.beforeEach(async ({ signInAs, page }) => {
    await signInAs("developer");
    await page.goto(`/exercises/${drillId("hello-pylearn")}`);
    await page.waitForFunction(
      () => (window as unknown as { monaco?: typeof import("monaco-editor") }).monaco?.editor.getEditors().length,
      null,
      { timeout: 60_000 }
    );
  });

  // Regression: typing on a busy page threw the cursor to the end and dropped letters. The wrapper
  // replaced the whole text whenever a render showed code a keystroke behind the editor (Monaco
  // 0.55 types through EditContext, which React renders at normal priority).
  test("keeps the cursor where the learner types, on a slow machine", async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    const starter = await page.evaluate(() => {
      const editor = (window as unknown as { monaco: typeof import("monaco-editor") }).monaco.editor.getEditors()[0]!;
      editor.focus();
      editor.setPosition({ lineNumber: 1, column: 1 });
      return editor.getValue();
    });
    await page.keyboard.type("total = sum(prices) + shipping_cost_for(order)\n", { delay: 25 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

    await expect.poll(async () => (await editorState(page)).value).toContain("shipping_cost_for(order)");
    const after = await editorState(page);
    // Monaco closes the bracket as it's typed, so the typed line may end with one it skipped over
    expect(after.value.split("\n")[0]).toMatch(/^total = sum\(prices\) \+ shipping_cost_for\(order\)\)?$/);
    expect(after.value.endsWith(starter)).toBe(true);
    expect({ line: after.line, column: after.column }).toEqual({ line: 2, column: 1 });
  });

  test("Reset puts the starter code back, and undo brings the learner's code back", async ({ page }) => {
    const starter = (await editorState(page)).value;
    await page.evaluate(() => {
      const editor = (window as unknown as { monaco: typeof import("monaco-editor") }).monaco.editor.getEditors()[0]!;
      editor.focus();
      editor.setPosition({ lineNumber: 1, column: 1 });
    });
    await page.keyboard.type("answer = 42\n");
    await expect.poll(async () => (await editorState(page)).value).toBe(`answer = 42\n${starter}`);

    await page.getByRole("button", { name: "Reset" }).click();
    await expect.poll(async () => (await editorState(page)).value).toBe(starter);
    await expect(page.getByRole("button", { name: "Reset" })).toBeDisabled();

    await page.evaluate(() => {
      const editor = (window as unknown as { monaco: typeof import("monaco-editor") }).monaco.editor.getEditors()[0]!;
      editor.focus();
      editor.trigger("test", "undo", null);
    });
    await expect.poll(async () => (await editorState(page)).value).toBe(`answer = 42\n${starter}`);
    // The undone text is the learner's again: Reset is back on
    await expect(page.getByRole("button", { name: "Reset" })).toBeEnabled();
  });
});
