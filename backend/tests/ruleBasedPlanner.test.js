import test from "node:test";
import assert from "node:assert/strict";
import { createRuleBasedPlanner } from "../src/services/ruleBasedPlanner.js";
import { createMockServices } from "./support/travelFixtures.js";
import { createJourneyAgent } from "../src/services/journeyAgent.js";
import { validateItinerary, dailyWindows } from "../src/services/itineraryService.js";
import { calculateBudget } from "../src/services/budgetService.js";
import { tripFixture } from "./support/fixture.js";
import { addDays, minutes } from "../src/utils/dates.js";

async function context(patch = {}) {
  const input = tripFixture(patch), fixtures = createMockServices();
  return { input, flight: (await fixtures.travel.flights(input))[0], hotel: (await fixtures.travel.hotels(input))[0], places: await fixtures.places.search(input) };
}

test("same candidates/inputs produce repeatable complete schedules with known IDs and no revisits", async () => {
  const c = await context({ language: "ar" }), copy = structuredClone(c);
  const planner = createRuleBasedPlanner();
  const [a, b] = await Promise.all([planner.generate(c), planner.generate(c)]);
  assert.deepEqual(a, b); assert.deepEqual(c, copy);
  const days = validateItinerary(a, c);
  assert.equal(days.length, 5);
  const ids = days.flatMap((d) => d.items.map((i) => i.placeId));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => c.places.some((p) => p.id === id)));
  assert.ok(days.flatMap((d) => d.items).every((i) => /مطابق|تنوع/.test(i.reason)));
});

test("planner covers supplied interest types rather than filling every slot with one category", async () => {
  const c = await context();
  c.onlyDay = 1;
  c.places = [
    { ...c.places[0], id: "museum", type: "museum", types: ["museum"], estimatedCost: null },
    { ...c.places[1], id: "food", type: "restaurant", types: ["restaurant"], estimatedCost: null },
    { ...c.places[2], id: "museum2", type: "museum", types: ["museum"], estimatedCost: null },
  ];
  const result = await createRuleBasedPlanner().generate(c);
  const ids = result.days[0].items.map((i) => i.placeId);
  assert.ok(ids.includes("food")); assert.ok(ids.includes("museum") || ids.includes("museum2"));
  validateItinerary(result, c);
});

test("activities honor the known all-traveler budget; missing prices remain unknown and mismatched currencies are skipped", async () => {
  const c = await context({ totalBudget: "150", preferences: { foodDaily: "0", transportDaily: "0", otherCosts: "0", pace: "busy" } });
  c.flight.price = "50"; c.hotel.price = "50";
  c.places = [
    { ...c.places[0], id: "too-expensive", estimatedCost: "100", currency: "SAR" },
    { ...c.places[1], id: "affordable", estimatedCost: "10", currency: "SAR" },
    { ...c.places[2], id: "unknown", estimatedCost: null },
    { ...c.places[3], id: "wrong-currency", estimatedCost: "1", currency: "USD" },
  ];
  const days = validateItinerary(await createRuleBasedPlanner().generate(c), c);
  const ids = days.flatMap((d) => d.items.map((i) => i.placeId));
  assert.ok(!ids.includes("too-expensive")); assert.ok(!ids.includes("wrong-currency"));
  const budget = calculateBudget(c.input, c.flight, c.hotel, days);
  assert.equal(budget.overBudget, false); assert.equal(budget.isComplete, false); assert.ok(budget.unknownActivityCount > 0);
});

test("day regeneration reserves unchanged activities and their fees", async () => {
  const c = await context({ totalBudget: "150", preferences: { foodDaily: "0", transportDaily: "0", otherCosts: "0" } });
  c.flight.price = "50"; c.hotel.price = "50"; c.onlyDay = 1;
  c.places = [{ ...c.places[0], id: "visited", estimatedCost: "20", currency: "SAR" }, { ...c.places[1], id: "new", estimatedCost: "20", currency: "SAR" }];
  c.keptDays = [{ dayNumber: 2, date: addDays(c.input.startDate, 1), items: [{ placeId: "visited", place: c.places[0] }] }];
  const raw = await createRuleBasedPlanner().generate(c);
  assert.equal(raw.days.length, 1);
  assert.deepEqual(raw.days[0].items, []); // Remaining SAR 10 cannot cover SAR 40 for two travelers.
});

test("closed/invalid places are skipped; arrival/departure windows and selected offers are preserved", async () => {
  const c = await context();
  c.places = [
    { ...c.places[0], id: "closed", businessStatus: "CLOSED_TEMPORARILY" },
    { ...c.places[1], id: "out-of-range", latitude: 95 },
    { ...c.places[2], id: "no-openings", openingHours: [] },
    { ...c.places[3], id: "valid", estimatedCost: "0", openingHours: null },
  ];
  const raw = await createRuleBasedPlanner().generate(c);
  validateItinerary(raw, c);
  assert.equal(raw.selectedFlightId, c.flight.id); assert.equal(raw.selectedHotelId, c.hotel.id);
  assert.deepEqual(raw.days.flatMap((d) => d.items.map((i) => i.placeId)), ["valid"]);
  assert.ok(minutes(raw.days[0].items[0].startTime) >= 14 * 60);
});

test("no candidates yields honest empty days; pace limits are never exceeded", async () => {
  const c = await context();
  const planner = createRuleBasedPlanner();
  const empty = await planner.generate({ ...c, places: [] });
  assert.equal(empty.days.length, 5); assert.ok(empty.days.every((d) => !d.items.length));
  for (const [pace, max] of Object.entries({ relaxed: 2, balanced: 3, busy: 5 })) {
    const raw = await planner.generate({ ...c, input: { ...c.input, preferences: { ...c.input.preferences, pace } } });
    assert.ok(raw.days.every((d) => d.items.length <= max));
  }
});

test("nearby activities are grouped and a known long transfer can remove an infeasible visit", async () => {
  const c = await context(); c.onlyDay = 1; c.input.interests = ["history"];
  c.places = [
    { ...c.places[0], id: "a", estimatedCost: null, latitude: 41, longitude: 29 },
    { ...c.places[0], id: "far", estimatedCost: null, latitude: 41.15, longitude: 29.15 },
    { ...c.places[0], id: "near", estimatedCost: null, latitude: 41.001, longitude: 29 },
  ];
  const planner = createRuleBasedPlanner();
  const raw = await planner.generate(c);
  assert.deepEqual(raw.days[0].items.slice(0, 2).map((i) => i.placeId), ["a", "near"]);
  const restricted = await planner.generate({ ...c, places: c.places.slice(0, 2), planningHints: { routeTransfers: new Map([["1:a:far", 600]]) } });
  assert.deepEqual(restricted.days[0].items.map((i) => i.placeId), ["a"]);
});

test("free-text instructions are not silently treated as understood", async () => {
  const c = await context();
  await assert.rejects(() => createRuleBasedPlanner().generate({ ...c, instruction: "make a special plan" }), { code: "FREE_TEXT_NOT_SUPPORTED" });
});

test("Google route constraints safely shorten an infeasible day without requiring a language model", async () => {
  const c = await context(); c.onlyDay = 1;
  c.places = [{ ...c.places[0], id: "a", estimatedCost: null }, { ...c.places[3], id: "b", estimatedCost: null }];
  const providers = { plannerMode: "rules", aiMode: "rules", modes: { routes: "google" }, ai: createRuleBasedPlanner(),
    routes: { compute: async () => ({ provider: "google", isMock: false, legs: [{ durationSeconds: 8 * 3600 }] }) } };
  const result = await createJourneyAgent(providers).plan(c);
  assert.equal(result.days[0].items.length, 1);
  assert.equal(result.report.plannerProvider, "rules");
  assert.equal(result.report.status, "needs_review");
  assert.ok(result.report.attempts.length <= 3);
});

test("agent can run one targeted place search to cover an interest missing from the first search", async () => {
  const c = await context(); c.onlyDay = 1;
  const museum = { ...c.places[0], id: "museum", types: ["museum"], type: "museum", estimatedCost: null };
  const restaurant = { ...c.places[3], id: "food", types: ["restaurant"], type: "restaurant", estimatedCost: null };
  c.places = [museum]; let searches = 0;
  c.refreshPlaces = async (interests) => { searches++; assert.ok(interests.includes("food")); return [restaurant]; };
  const result = await createJourneyAgent({ plannerMode: "rules", ai: createRuleBasedPlanner() }).plan(c);
  assert.equal(searches, 1); assert.equal(result.report.tools.additionalPlaceSearches, 1);
  assert.equal(result.report.status, "validated");
  assert.ok(result.days[0].items.some((item) => item.placeId === "food"));
});
