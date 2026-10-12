const { test, expect } = require("@playwright/test");
const path = require("node:path");
const shot = async (page, name) => {
  const dismiss = page.locator(".toast button");
  if (await dismiss.isVisible()) await dismiss.click();
  return page.screenshot({
    path: path.join("test-results", "screenshots", name + ".png"),
    fullPage: true,
  });
};
test("public Figma screens, real assets, contact submission, and responsive RTL", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of ["/", "/about", "/contact", "/login", "/register"]) {
    await page.setViewportSize(
      route === "/login"
        ? { width: 1536, height: 678 }
        : { width: 1521, height: route === "/register" ? 724 : 900 },
    );
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toBeVisible();
    const broken = await page
      .locator("img")
      .evaluateAll((images) =>
        images
          .filter((im) => !im.complete || !im.naturalWidth)
          .map((im) => im.src),
      );
    expect(broken).toEqual([]);
    await shot(page, route === "/" ? "home" : route.slice(1));
  }
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send a message · Email" }).click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Contact Test Traveler");
  await page
    .getByLabel("Email", { exact: true })
    .fill("contact-test@example.com");
  await page.getByLabel("Subject", { exact: true }).fill("Browser acceptance");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Testing the actual contact form and MySQL persistence.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your message has been saved.",
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to Arabic" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("h1")).toContainText("رحلتك");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await shot(page, "home-mobile-ar");
  await page.getByRole("button", { name: "قائمة التنقل" }).click();
  await expect(
    page.getByRole("link", { name: "عن جلجامش", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "عن جلجامش", exact: true }).click();
  await expect(page.locator("h1")).toContainText("سفر");
  await shot(page, "about-mobile-ar");
  expect(errors).toEqual([]);
});
test("registered traveler plans, edits, persists versions, saves, favorites, budgets and signs out", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `browser-${Date.now()}@example.com`;
  await page.goto("/planner");
  await expect(page).toHaveURL(/login\?next=/);
  await page.getByRole("link", { name: "New here? Create an account" }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Gilgamish Tester");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Travel-test-password-2026");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/planner/);
  for (const [label, query, result] of [
    ["Origin", "JED", "Jeddah"],
    ["Destination", "IST", "Istanbul"],
  ]) {
    await page.getByRole("combobox", { name: label, exact: true }).fill(query);
    await page.getByRole("option").filter({ hasText: result }).click();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Make this journey yours." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Find flights & hotels", exact: true })
    .click();
  await expect(page.locator(".offer-card")).toHaveCount(6);
  await shot(page, "offers");
  await page
    .locator(".offer-card")
    .nth(0)
    .getByRole("button", { name: "Select", exact: true })
    .click();
  await page
    .locator(".offer-card")
    .nth(3)
    .getByRole("button", { name: "Select", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate my plan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plans\/[a-f0-9-]+$/);
  await expect(
    page.getByRole("heading", { name: "Daily itinerary", exact: true }),
  ).toBeVisible();
  const original = page.url();
  await shot(page, "plan");
  await expect(page.locator(".plan-notes")).toContainText("Development mode");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "♡ Add to favorites", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "♥ Favorited", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit day", exact: true })
    .nth(1)
    .click();
  await page
    .getByRole("button", { name: "Remove activity", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Save day as new version", exact: true })
    .click();
  await expect(page).not.toHaveURL(original);
  await expect(page.locator(".timeline>li")).toHaveCount(5);
  const edited = page.url();
  await page
    .getByRole("button", { name: "Adjust budget →", exact: true })
    .click();
  await page.getByLabel("Total budget", { exact: true }).fill("4000");
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await expect(page).not.toHaveURL(edited);
  await expect(page.locator(".budget-remaining")).toContainText("4,000");
  await page.getByRole("button", { name: "Modify", exact: true }).click();
  await expect(page.getByLabel("Plan version")).toContainText("Version 1");
  await expect(page.getByLabel("Plan version")).toContainText("Version 3");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Regenerate", exact: true }).click();
  await page.getByLabel("Travel pace", { exact: true }).selectOption("relaxed");
  await page
    .getByRole("button", { name: "Create new version", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".timeline>li")).toHaveCount(5);
  const beforeDayRegeneration = page.url();
  const unchangedDay = await page.locator(".timeline>li").first().innerText();
  await page
    .getByRole("button", { name: "Edit day", exact: true })
    .nth(1)
    .click();
  await page
    .getByRole("button", { name: "Regenerate day", exact: true })
    .click();
  await page
    .getByLabel("Travel pace", { exact: true })
    .selectOption("balanced");
  await page
    .getByRole("button", { name: "Create new version", exact: true })
    .click();
  await expect(page).not.toHaveURL(beforeDayRegeneration);
  await expect(page.locator(".timeline>li").first()).toHaveText(unchangedDay, {
    useInnerText: true,
  });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".site-header")).not.toBeVisible();
  const pdf = await page.pdf({
    path: path.join("test-results", "itinerary.pdf"),
    format: "A4",
    printBackground: true,
  });
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Book now", exact: true }).click();
  const link = page.getByRole("link", { name: "Search flights with provider" });
  expect(await link.getAttribute("href")).toMatch(/^https:/);
  await expect(page.getByRole("dialog")).toContainText(
    "No reservation or payment",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("link", { name: "Dashboard", exact: true })
    .first()
    .click();
  await expect(page.locator(".saved-trip")).toHaveCount(1);
  await expect(page.locator(".favorite-card")).toHaveCount(1);
  await shot(page, "dashboard");
  await page.reload();
  await expect(page.locator(".saved-trip")).toHaveCount(1);
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === "gilgamish_session");
  expect(session.httpOnly).toBe(true);
  expect(session.sameSite).toBe("Lax");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Switch to Arabic" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await shot(page, "dashboard-mobile-ar");
  await page.locator(".saved-trip").first().click();
  await expect(page.locator(".timeline>li")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await shot(page, "plan-mobile-ar");
  await page.getByRole("button", { name: "قائمة التنقل" }).click();
  await page.getByRole("link", { name: "الملف الشخصي", exact: true }).click();
  await expect(page).toHaveURL(/profile/);
  await page.getByLabel("الاسم الكامل", { exact: true }).fill("جلجامش");
  await page
    .getByRole("button", { name: "حفظ التفضيلات", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("الاسم الكامل", { exact: true })).toHaveValue(
    "جلجامش",
  );
  await page.getByRole("button", { name: "قائمة التنقل" }).click();
  await page.getByRole("button", { name: "خروج", exact: true }).click();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("البريد الإلكتروني", { exact: true }).fill(email);
  await page
    .getByLabel("كلمة المرور", { exact: true })
    .fill("Travel-test-password-2026");
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator(".saved-trip")).toHaveCount(1);
  expect(errors).toEqual([]);
});
