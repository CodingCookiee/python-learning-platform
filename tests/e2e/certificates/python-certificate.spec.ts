import { expect, test } from "../fixtures/learner.fixture";

test.describe("The Python certificate", () => {
  test("is claimed by a black belt and can be checked by anyone", async ({ signInAs, profile, page, request, browser }) => {
    await signInAs("black-belt");
    await expect(page.getByText("Your certificate is ready: Black belt in Python")).toBeVisible();

    await profile.goto();
    await profile.claimCertificate("Ada Lovelace");
    await expect(page).toHaveURL(/\/certificates\/PL-PY-[0-9A-Z]{4}-[0-9A-Z]{4}$/, { timeout: 60_000 });
    const code = page.url().split("/").pop()!;
    await expect(page.getByRole("heading", { level: 1, name: "Black belt in Python" })).toBeVisible();
    await expect(page.getByText("Ada Lovelace").first()).toBeVisible();

    // The holder can add it to LinkedIn, filled in
    const linkedIn = new URL((await page.getByRole("link", { name: "Add to LinkedIn" }).getAttribute("href"))!);
    expect(linkedIn.origin + linkedIn.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(Object.fromEntries(linkedIn.searchParams)).toMatchObject({
      startTask: "CERTIFICATION_NAME",
      name: "Black belt in Python",
      organizationName: "pylearn",
      certId: code,
    });

    // The share image renders (its fonts are read from disk)
    const image = await request.get(`/certificates/${code}/image`);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
    expect((await image.body()).length).toBeGreaterThan(50_000);

    // A stranger, signed out, sees the same certificate
    const stranger = await browser.newContext();
    const strangerPage = await stranger.newPage();
    await strangerPage.goto(`/certificates/${code}`);
    await expect(strangerPage.getByRole("heading", { level: 1, name: "Black belt in Python" })).toBeVisible();
    await expect(strangerPage.getByText("Ada Lovelace").first()).toBeVisible();
    await stranger.close();
  });

  test("is a plain 404 for an ID that doesn't exist", async ({ request }) => {
    const res = await request.get("/certificates/PL-PY-0000-0000");
    expect(res.status()).toBe(404);
  });
});
