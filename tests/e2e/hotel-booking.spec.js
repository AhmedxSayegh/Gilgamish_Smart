const { test, expect } = require("@playwright/test");
test.use({ channel: "msedge" });
const tripId = "00000000-0000-4000-8000-000000000002",
  planId = "00000000-0000-4000-8000-000000000003";
const future = (offset) =>
  new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const hotel = {
  id: "serpapi-test",
  provider: "serpapi",
  providerHotelId: "CgoI_TestHotel_123",
  name: "Observed Hotel",
  description: "A hotel with observed prices",
  address: "Istanbul",
  price: "500.00",
  nightlyPrice: "125.00",
  currency: "SAR",
  rooms: 1,
  adults: 2,
  stars: 4,
  rating: 4.5,
  checkIn: future(30),
  checkOut: future(34),
  observedAt: new Date().toISOString(),
  taxesIncluded: true,
  amenities: ["Wi-Fi"],
  images: [],
};
const flight = {
  id: "flight-test",
  provider: "ignav",
  providerOfferId: "ignav-offer",
  airline: "Observed Airline",
  price: "1000",
  currency: "SAR",
  origin: "JED",
  destination: "IST",
  departureTime: future(30) + "T08:00:00",
  arrivalTime: future(30) + "T12:00:00",
  returnDepartureTime: future(34) + "T18:00:00",
  returnArrivalTime: future(34) + "T22:00:00",
  stops: 0,
  returnStops: 0,
  observedAt: new Date().toISOString(),
};
const trip = {
  id: tripId,
  origin: "Jeddah",
  originCode: "JED",
  destination: "Istanbul",
  destinationCode: "IST",
  startDate: future(30),
  endDate: future(34),
  adults: 2,
  children: 0,
  totalBudget: "12000",
  currency: "SAR",
  language: "en",
  interests: ["history", "food"],
  preferences: {
    hotelStars: 4,
    flightOption: "cheapest",
    directPreferred: false,
    pace: "balanced",
    foodDaily: "50",
    transportDaily: "20",
    otherCosts: "0",
  },
  plans: [],
};
const plan = {
  id: planId,
  tripId,
  input: trip,
  hotel,
  flight,
  days: [{ dayNumber: 1, date: trip.startDate, items: [] }],
  mode: "live",
  warnings: [],
  budget: {
    totalCost: "1500",
    totalBudget: "12000",
    remainingBudget: "10500",
    currency: "SAR",
    items: [],
    isComplete: true,
  },
  version: 1,
};

async function mocks(page, language = "en") {
  const state = {
    scenario: "normal",
    hotelCalls: [],
    flightCalls: 0,
    pages: [],
  };
  page.on("pageerror", (error) => state.pages.push(error.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    let data;
    if (path.includes("/hotels/")) {
      state.hotelCalls.push(url);
      if (state.scenario === "error")
        return route.fulfill({
          status: 503,
          json: {
            success: false,
            error: {
              code: "SERPAPI_RATE_LIMITED",
              message:
                "Hotel provider quota is temporarily unavailable. Retry later.",
            },
          },
        });
      if (state.scenario === "loading")
        await new Promise((resolve) => setTimeout(resolve, 500));
      data = {
        hotel,
        observedAt: hotel.observedAt,
        links:
          state.scenario === "empty"
            ? []
            : [
                {
                  source: "Observed Seller",
                  url: "https://seller.example/book",
                  type: "seller_offer",
                  price: "530.00",
                  currency: "SAR",
                  taxesIncluded: true,
                  freeCancellation: true,
                },
                {
                  source: "Nightly Seller",
                  url: "https://night.example/book",
                  type: "seller_offer",
                  price: null,
                  nightlyPrice: "125.00",
                  currency: "SAR",
                  taxesIncluded: null,
                },
                {
                  source: "Observed Hotel",
                  url: "https://hotel.example/",
                  type: "property_website",
                  price: null,
                  currency: "SAR",
                },
              ],
      };
    } else if (path === "/api/flights/booking-links") {
      state.flightCalls++;
      data = { options: [] };
    } else if (path === "/api/auth/me")
      data = { user: { name: "Hotel Tester", language }, csrfToken: "test" };
    else if (path === "/api/health")
      data = {
        mode: "live",
        aiMode: "rules",
        services: { hotels: "serpapi", flights: "ignav" },
      };
    else if (path === `/api/trips/${tripId}`) data = trip;
    else if (path === `/api/plans/${planId}`) data = plan;
    else if (path === "/api/recommendations")
      data = { mode: "live", flights: [flight], hotels: [hotel] };
    else data = {};
    return route.fulfill({ json: { success: true, data } });
  });
  return state;
}

test("planner hotel card loads details and external seller links only after Book now", async ({
  page,
  context,
}) => {
  const state = await mocks(page);
  await page.goto(`/planner?trip=${tripId}`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Find flights & hotels", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: hotel.name, exact: true }),
  ).toBeVisible();
  expect(state.hotelCalls).toHaveLength(0);
  await expect(
    page.getByRole("button", { name: "Provider search", exact: true }),
  ).toBeVisible();
  state.scenario = "loading";
  await page.getByRole("button", { name: "Book now", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Retrieving hotel" }),
  ).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Hotel details & booking" });
  await expect(
    dialog.getByRole("link", {
      name: "Book with Observed Seller",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://seller.example/book");
  await expect(
    dialog.getByRole("link", {
      name: "Book with Observed Seller",
      exact: true,
    }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    dialog.getByText("Per night · total unavailable", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Hotel website · confirm your dates and price there"),
  ).toBeVisible();
  expect(state.hotelCalls[0].searchParams.get("tripId")).toBe(tripId);
  expect(state.flightCalls).toBe(0);
  expect(context.pages()).toHaveLength(1);
  expect(state.pages).toEqual([]);
  await page.screenshot({
    path: "test-results/screenshots/serpapi-hotel-desktop.png",
    fullPage: true,
  });
});

test("saved plan uses planId; Arabic mobile shows error, retry, empty and seller states", async ({
  page,
  context,
}) => {
  const state = await mocks(page, "ar");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/plans/${planId}`);
  await page.getByRole("button", { name: "احجز الآن", exact: true }).click();
  state.scenario = "error";
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "احجز الآن", exact: true })
    .click();
  const hotelDialog = page.getByRole("dialog", {
    name: "تفاصيل الفندق والحجز",
  });
  await expect(hotelDialog.getByRole("alert")).toContainText(
    "بلغ مزوّد الفنادق",
  );
  expect(state.hotelCalls[0].searchParams.get("planId")).toBe(planId);
  expect(state.hotelCalls[0].searchParams.has("tripId")).toBe(false);
  state.scenario = "empty";
  await hotelDialog.getByRole("button", { name: "حاول مجدداً" }).click();
  await expect(hotelDialog.getByRole("status")).toContainText(
    "لا تتوفر روابط حجز",
  );
  await hotelDialog.getByRole("button", { name: "إغلاق", exact: true }).click();
  state.scenario = "normal";
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "احجز الآن", exact: true })
    .click();
  await expect(
    hotelDialog.getByRole("link", {
      name: "احجز لدى Observed Seller",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(
    await hotelDialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  expect(context.pages()).toHaveLength(1);
  expect(state.flightCalls).toBe(0);
  expect(state.pages).toEqual([]);
  await page.screenshot({
    path: "test-results/screenshots/serpapi-hotel-mobile-ar.png",
    fullPage: true,
  });
});
