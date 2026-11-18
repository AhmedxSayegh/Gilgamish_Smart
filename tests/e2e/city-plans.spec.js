const { test, expect } = require("@playwright/test");
test.use({ channel: "msedge" });
const slugs = [
  "damascus",
  "istanbul",
  "madinah",
  "makkah",
  "jeddah",
  "riyadh",
  "amman",
  "dubai",
  "cairo",
  "paris",
];
test("all destination links show sample plans and expandable itineraries in both languages", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const language of ["ar", "en"]) {
    await page.addInitScript(
      (lang) => localStorage.setItem("gilgamish-language", lang),
      language,
    );
    for (const slug of slugs) {
      await page.goto("/");
      await page
        .locator(`#destinations a[href='/destinations/${slug}/plans']`)
        .first()
        .click();
      await expect(page).toHaveURL(new RegExp(`/destinations/${slug}/plans$`));
      await expect(page.locator(".sample-disclosure")).toContainText(
        language === "ar"
          ? "ليست مشاركات من مستخدمين سابقين"
          : "not submissions from previous users",
      );
      await expect(page.locator(".sample-plan-card")).toHaveCount(3);
      for (const [index, card] of (
        await page.locator(".sample-plan-card").all()
      ).entries()) {
        await card.locator("summary").click();
        await expect(card.locator(".sample-days > li")).toHaveCount(
          [3, 5, 7][index],
        );
        await expect(card.locator("blockquote")).toHaveCount(2);
        await expect(card.locator(".sample-days")).toBeVisible();
      }
      await expect(
        page.locator(".sample-city-actions a").last(),
      ).toHaveAttribute("href", `/guides/${slug}`);
    }
  }
  expect(errors).toEqual([]);
});
test("mobile sample plan reload, layout and unknown city recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("gilgamish-language", "ar"),
  );
  await page.goto("/destinations/damascus/plans");
  await page.reload();
  await expect(page.locator("h1")).toContainText("دمشق");
  await page.locator("summary").first().click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/screenshots/sample-city-plans-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/screenshots/sample-city-plans-desktop.png",
    fullPage: true,
  });
  await page.goto("/destinations/unknown/plans");
  await expect(page.locator("h1")).toHaveText("المدينة غير موجودة");
  await page.getByRole("link", { name: "تصفح الوجهات" }).click();
  await expect(page.locator("#destinations")).toBeInViewport();
});
