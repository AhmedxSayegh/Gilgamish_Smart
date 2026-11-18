import test from "node:test";
import assert from "node:assert/strict";
import { tripFixture } from "./support/fixture.js";
import { cents, amount } from "../src/utils/currency.js";
import { createMockServices } from "./support/travelFixtures.js";
import { validateItinerary, isOpen } from "../src/services/itineraryService.js";
import { calculateBudget } from "../src/services/budgetService.js";
import { tripSchema } from "../src/validators/schemas.js";
import { selectOffers } from "../src/services/rankingService.js";
async function context() {
  const input = tripFixture(),
    p = createMockServices();
  const c = {
    input,
    flight: (await p.travel.flights(input))[0],
    hotel: (await p.travel.hotels(input))[0],
    places: await p.places.search(input),
  };
  return { ...c, raw: await p.ai.generate(c) };
}
test("money arithmetic uses exact cents and rejects excess precision", () => {
  assert.equal(amount(cents("0.10") + cents("0.20")), "0.30");
  assert.throws(() => cents("1.001"));
  assert.throws(() => cents("-1"));
});
test("trip validation rejects impossible dates, equal airports and excessive travelers", () => {
  const t = tripFixture();
  for (const patch of [
    { endDate: t.startDate },
    { startDate: "2027-02-30" },
    { adults: 9, children: 1 },
    { destinationCode: t.originCode },
    { totalBudget: "0" },
  ])
    assert.equal(tripSchema.safeParse({ ...t, ...patch }).success, false);
});
test("verified fixture candidates produce a complete daily schedule and honest budget", async () => {
  const c = await context(),
    days = validateItinerary(c.raw, c),
    b = calculateBudget(c.input, c.flight, c.hotel, days);
  assert.equal(days.length, 5);
  assert.ok(b.unknownActivityCount > 0);
  assert.equal(b.isComplete, false);
  const total = b.items.reduce((s, i) => s + cents(i.amount), 0);
  assert.equal(b.totalCost, amount(total));
  assert.equal(b.remainingBudget, amount(cents(c.input.totalBudget) - total));
  assert.equal(b.items.find((i) => i.category === "food").amount, "800.00");
});
test("budget rejects mismatched currencies and detects overspending", async () => {
  const c = await context(),
    days = validateItinerary(c.raw, c);
  assert.throws(
    () =>
      calculateBudget(c.input, { ...c.flight, currency: "USD" }, c.hotel, days),
    { code: "CURRENCY_MISMATCH" },
  );
  const b = calculateBudget(
    { ...c.input, totalBudget: "10" },
    c.flight,
    c.hotel,
    days,
  );
  assert.equal(b.overBudget, true);
  assert.ok(b.remainingBudget.startsWith("-"));
});
test("AI validation rejects fabricated IDs, overlapping times, invalid days and flight conflicts", async () => {
  const c = await context();
  const cases = [
    (r) => (r.selectedFlightId = "invented"),
    (r) => (r.days[0].items[0].placeId = "invented"),
    (r) => (r.days[1].items[1].startTime = r.days[1].items[0].startTime),
    (r) => (r.days[1].date = r.days[0].date),
    (r) => (r.days[0].items[0].startTime = "08:00"),
    (r) => (r.days[0].items[0].endTime = "25:00"),
  ];
  for (const mutate of cases) {
    const r = structuredClone(c.raw);
    mutate(r);
    assert.throws(() => validateItinerary(r, c));
  }
});
test("opening hours handle unknown, closed, overnight and continuously open places", () => {
  const sunday = "2027-01-03";
  assert.equal(isOpen({ openingHours: null }, sunday, 600, 700), true);
  assert.equal(isOpen({ openingHours: [] }, sunday, 600, 700), false);
  assert.equal(
    isOpen(
      {
        openingHours: [
          { open: { day: 6, hour: 22 }, close: { day: 0, hour: 2 } },
        ],
      },
      sunday,
      60,
      90,
    ),
    true,
  );
  assert.equal(
    isOpen({ openingHours: [{ open: { day: 0, hour: 0 } }] }, sunday, 100, 200),
    true,
  );
});
test("known closing time is enforced", async () => {
  const c = await context();
  c.places = c.places.map((p) => ({ ...p, openingHours: [] }));
  assert.throws(() => validateItinerary(c.raw, c), { code: "CLOSED_PLACE" });
});
test("manual offer selection uses only verified candidates and rejects stale IDs", async () => {
  const input = tripFixture(),
    p = createMockServices(),
    candidates = {
      flights: await p.travel.flights(input),
      hotels: await p.travel.hotels(input),
    };
  const selected = selectOffers(candidates, input, {
    flightId: "mock-flight-2",
    hotelId: "mock-hotel-3",
  });
  assert.equal(selected.flight.id, "mock-flight-2");
  assert.equal(selected.hotel.id, "mock-hotel-3");
  assert.throws(
    () => selectOffers(candidates, input, { flightId: "made-up-offer" }),
    { code: "OFFER_EXPIRED" },
  );
});
