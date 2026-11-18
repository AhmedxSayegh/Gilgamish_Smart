const { test, expect } = require("@playwright/test");
test.use({ channel: "msedge" });
const guides = [
  ["damascus", "Damascus", "دمشق", "Damascus", "دمشق"],
  ["istanbul", "Istanbul", "إسطنبول", "Ankara", "أنقرة"],
  ["madinah", "Madinah", "المدينة المنورة", "Riyadh", "الرياض"],
  ["makkah", "Makkah", "مكة المكرمة", "Riyadh", "الرياض"],
  ["jeddah", "Jeddah", "جدة", "Riyadh", "الرياض"],
  ["riyadh", "Riyadh", "الرياض", "Riyadh", "الرياض"],
  ["amman", "Amman", "عمّان", "Amman", "عمّان"],
  ["dubai", "Dubai", "دبي", "Abu Dhabi", "أبوظبي"],
  ["cairo", "Cairo", "القاهرة", "Cairo", "القاهرة"],
  ["paris", "Paris", "باريس", "Paris", "باريس"],
];

test("home cards open all ten public guides in both languages and preserve city/country facts", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const language of ["en", "ar"]) {
    await page.addInitScript(
      (value) => localStorage.setItem("gilgamish-language", value),
      language,
    );
    await page.goto("/");
    const cards = page.locator("#city-guides .city-guide-card");
    await expect(cards).toHaveCount(10);
    for (const [index, guide] of guides.entries()) {
      await expect(cards.nth(index)).toHaveAttribute(
        "href",
        `/guides/${guide[0]}`,
      );
      await cards.nth(index).scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          cards
            .nth(index)
            .locator("img")
            .evaluate((img) => img.complete && img.naturalWidth > 0),
        )
        .toBe(true);
    }
    if (language === "ar") {
      await page.evaluate(() => document.fonts.ready);
      await page.locator("#city-guides").screenshot({
        path: "test-results/screenshots/city-guides-home-ar.png",
      });
    }
    for (const [slug, en, ar, capitalEn, capitalAr] of guides) {
      await page.locator(`#city-guides a[href='/guides/${slug}']`).click();
      await expect(page).toHaveURL(new RegExp(`/guides/${slug}$`));
      await expect(page.locator("h1")).toContainText(
        language === "ar" ? ar : en,
      );
      await expect(page).toHaveTitle(new RegExp(language === "ar" ? ar : en));
      await expect(page.locator(".guide-facts dd").first()).toHaveText(
        language === "ar" ? capitalAr : capitalEn,
      );
      await expect(page.locator(".guide-detail-card")).toHaveCount(6);
      for (const card of await page.locator(".guide-detail-card").all()) {
        await expect(card.locator("h3")).not.toBeEmpty();
        await expect(card.locator("p")).not.toBeEmpty();
        await expect(card.locator("a").first()).toHaveAttribute(
          "href",
          /^https:\/\//,
        );
      }
      await expect(page.locator(".guide-plan-callout a")).toHaveAttribute(
        "href",
        `/planner?destination=${encodeURIComponent(en)}`,
      );
      await expect(page.locator(".guide-hero img")).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator(".guide-hero img")
            .evaluate((img) => img.complete && img.naturalWidth > 0),
        )
        .toBe(true);
      await expect(
        page.locator(".guide-travel-alert, .guide-photo-credits"),
      ).toHaveCount(0);
      await expect(page.locator(".guide-overview p")).not.toBeEmpty();
      await expect(page.locator(".guide-landmark")).toHaveCount(3);
      for (const landmark of await page.locator(".guide-landmark").all()) {
        await expect(landmark.locator("h3")).not.toBeEmpty();
        await expect(landmark.locator("p")).not.toBeEmpty();
      }
      await page.locator(".guide-breadcrumb a").nth(1).click();
      await expect(page).toHaveURL(/\/#city-guides$/);
      await expect(page.locator("#city-guides-heading")).toBeInViewport();
    }
  }
  expect(errors).toEqual([]);
});

test("Arabic mobile guide, deep-link reload, landmarks and unknown-city recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("gilgamish-language", "ar"),
  );
  await page.goto("/guides/damascus");
  await page.reload();
  await expect(page.locator("h1")).toHaveText("دليل دمشق");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const card of await page
    .locator(".guide-related .city-guide-card")
    .all()) {
    await card.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        card
          .locator("img")
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/screenshots/city-guide-damascus-mobile-ar.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "test-results/screenshots/city-guide-damascus-mobile-top-ar.png",
  });
  await page
    .locator(".guide-landmarks")
    .screenshot({
      path: "test-results/screenshots/city-landmarks-mobile-ar.png",
    });
  await page.setViewportSize({ width: 1280, height: 960 });
  await page
    .locator(".guide-landmarks")
    .screenshot({
      path: "test-results/screenshots/city-landmarks-desktop-ar.png",
    });
  await page.locator(".guide-details-grid").screenshot({
    path: "test-results/screenshots/city-guide-details-desktop-ar.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/guides/dubai");
  await expect(page.locator(".guide-facts dd").first()).toHaveText("أبوظبي");
  await page.goto("/#city-guides");
  await expect(page.locator("#city-guides .city-guide-card")).toHaveCount(10);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".guide-photo-link")).toHaveCount(0);
  await page.goto("/guides/unknown-city");
  await expect(page.locator("h1")).toContainText("غير متوفر");
  await page.getByRole("link", { name: "تصفح أدلة المدن" }).click();
  await expect(page.locator("#city-guides-heading")).toBeInViewport();
});
