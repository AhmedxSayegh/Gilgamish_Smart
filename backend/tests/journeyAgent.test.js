import test from "node:test";
import assert from "node:assert/strict";
import { createJourneyAgent } from "../src/services/journeyAgent.js";
import { createMockServices } from "./support/travelFixtures.js";
import { tripFixture } from "./support/fixture.js";
import { AppError } from "../src/utils/errors.js";
import { rankPlaces, selectOffers } from "../src/services/rankingService.js";
import { createTripPlannerService } from "../src/services/tripPlannerService.js";
import { MemoryRepository } from "./support/memoryRepository.js";

async function context() {
  const input = tripFixture(), providers = createMockServices();
  return { input, flight: (await providers.travel.flights(input))[0], hotel: (await providers.travel.hotels(input))[0], onlyDay: 1,
    places: [
      { id: "museum", name: "Museum", type: "museum", types: ["museum"], latitude: 41, longitude: 29, openingHours: null, estimatedCost: null },
      { id: "food", name: "Restaurant", type: "restaurant", types: ["restaurant"], latitude: 41.001, longitude: 29, openingHours: null, estimatedCost: null },
    ] };
}
function raw(c, ids) {
  return { selectedFlightId: c.flight.id, selectedHotelId: c.hotel.id, days: [{ dayNumber: 1, date: c.input.startDate,
    items: ids.map((id, index) => ({ placeId: id, startTime: index ? "15:30" : "14:00", endTime: index ? "16:30" : "15:00", reason: "Matches supplied type" })) }] };
}

test("agent feedback improves supported interests while preserving selected offers", async () => {
  const c = await context(); let calls = 0;
  const providers = { aiMode: "controlled-test", ai: { generate: async (ctx) => {
    assert.equal(ctx.flight.id, c.flight.id); assert.equal(ctx.hotel.id, c.hotel.id);
    if (calls++) { assert.match(ctx.agentFeedback.join(" "), /food/); return raw(c, ["museum", "food"]); }
    return raw(c, ["museum"]);
  } } };
  const result = await createJourneyAgent(providers).plan(c);
  assert.equal(calls, 2); assert.equal(result.report.status, "validated");
  assert.equal(result.report.checks.unknownActivityCount, 2);
  assert.equal(result.days[0].items.length, 2);
});

test("repeated partial drafts stop early and retain review warnings", async () => {
  const c = await context(); let calls = 0;
  const result = await createJourneyAgent({ ai: { generate: async () => { calls++; return raw(c, ["museum"]); } } }).plan(c);
  assert.equal(calls, 2); assert.equal(result.report.stopReason, "repeated_result");
  assert.equal(result.report.status, "needs_review"); assert.ok(result.warnings.includes("AGENT_REVIEW_REQUIRED"));
});

test("invalid drafts get bounded repairs and are never accepted; provider failures fail immediately", async () => {
  const c = await context(); let calls = 0;
  await assert.rejects(() => createJourneyAgent({ ai: { generate: async () => { calls++; return raw(c, ["invented"]); } } }).plan(c), { code: "UNKNOWN_PLACE" });
  assert.equal(calls, 3); calls = 0;
  await assert.rejects(() => createJourneyAgent({ ai: { generate: async () => { calls++; throw new AppError(502, "LOCAL_AI_UNAVAILABLE", "unavailable"); } } }).plan(c), { code: "LOCAL_AI_UNAVAILABLE" });
  assert.equal(calls, 1);
});

test("a repair can recover an invalid schedule and select the best valid result", async () => {
  const c = await context(); let calls = 0;
  const result = await createJourneyAgent({ ai: { generate: async (ctx) => {
    if (!calls++) return raw(c, ["invented"]);
    assert.match(ctx.agentFeedback.join(" "), /UNKNOWN_PLACE/); return raw(c, ["museum", "food"]);
  } } }).plan(c);
  assert.equal(result.report.attempts[0].valid, false);
  assert.equal(result.report.status, "validated");
});

test("known activity overspending is corrected without changing selected travel offers", async () => {
  const c = await context(); c.input = { ...c.input, totalBudget: "1000", interests: ["history"], preferences: { ...c.input.preferences, foodDaily: "0", transportDaily: "0", otherCosts: "0" } };
  c.flight.price = "10"; c.hotel.price = "10";
  c.places = [c.places[0], { ...c.places[0], id: "cheap", name: "Cheap Museum", estimatedCost: "1", currency: "SAR" }];
  c.places[0].estimatedCost = "900"; c.places[0].currency = "SAR";
  let calls = 0;
  const result = await createJourneyAgent({ ai: { generate: async (ctx) => {
    if (calls++) { assert.match(ctx.agentFeedback.join(" "), /budget/); return raw(c, ["cheap"]); }
    return raw(c, ["museum"]);
  } } }).plan(c);
  assert.equal(result.days[0].items[0].placeId, "cheap"); assert.equal(result.report.checks.knownCostsWithinBudget, true);
});

test("verified route legs adjust transfer gaps before saving and failures are not replaced by estimates", async () => {
  const c = await context();
  const providers = { modes: { routes: "google" }, ai: { generate: async () => raw(c, ["museum", "food"]) },
    routes: { compute: async () => ({ provider: "google", isMock: false, legs: [{ durationSeconds: 7200 }] }) } };
  const result = await createJourneyAgent(providers).plan(c);
  assert.equal(result.days[0].items[1].startTime, "17:00");
  assert.equal(result.report.checks.routeCheckedDays, 1);
  providers.routes.compute = async () => { throw new AppError(502, "GOOGLE_ROUTES_UNAVAILABLE", "unavailable"); };
  await assert.rejects(() => createJourneyAgent(providers).plan(c), { code: "GOOGLE_ROUTES_UNAVAILABLE" });
});

test("ranking removes closed/invalid/duplicate places and gives supported interests variety", async () => {
  const c = await context();
  const candidates = [
    ...c.places, { ...c.places[0], id: "duplicate", name: "Museum", latitude: 41.00001 },
    { ...c.places[0], id: "closed", businessStatus: "CLOSED_TEMPORARILY" },
    { ...c.places[0], id: "invalid", latitude: null },
  ];
  const ranked = rankPlaces(candidates, c.input);
  assert.equal(ranked.length, 2); assert.ok(ranked.some((p) => p.id === "food"));
});

test("automatic offer selection considers budget but never replaces an explicit traveler choice", async () => {
  const c = await context(); c.input.totalBudget = "1000";
  c.input.preferences = { ...c.input.preferences, foodDaily: "0", transportDaily: "0", otherCosts: "0", hotelStars: 5 };
  const candidates = { flights: [{ ...c.flight, id: "flight", price: "100" }], hotels: [
    { ...c.hotel, id: "preferred", stars: 5, price: "1000" }, { ...c.hotel, id: "affordable", stars: 3, price: "100" },
  ] };
  assert.equal(selectOffers(candidates, c.input).hotel.id, "affordable");
  assert.equal(selectOffers(candidates, c.input, { hotelId: "preferred" }).hotel.id, "preferred");
  candidates.flights[0].expiresAt = "2000-01-01T00:00:00Z";
  assert.throws(() => selectOffers(candidates, c.input), { code: "NO_FLIGHTS" });
});

test("day regeneration evaluation includes known costs on the unchanged days", async () => {
  const c = await context(); c.input = { ...c.input, totalBudget: "1000", interests: ["history"], preferences: { ...c.input.preferences, foodDaily: "0", transportDaily: "0", otherCosts: "0" } };
  c.flight.price = "10"; c.hotel.price = "10";
  c.keptDays = [{ dayNumber: 2, date: c.input.endDate, items: [{ placeId: "kept", place: { estimatedCost: "600", currency: "SAR" } }] }];
  const result = await createJourneyAgent({ ai: { generate: async () => raw(c, ["museum"]) } }).plan(c);
  assert.equal(result.report.checks.knownCostsWithinBudget, false);
  assert.ok(result.report.issues.includes("FIXED_COSTS_OVER_BUDGET"));
});

test("agent keeps an affordable valid draft instead of replacing it with an over-budget revision", async () => {
  const c = await context(); c.input.totalBudget = "1000";
  c.input.preferences = { ...c.input.preferences, foodDaily: "0", transportDaily: "0", otherCosts: "0" };
  c.flight.price = "10"; c.hotel.price = "10";
  c.places[0] = { ...c.places[0], estimatedCost: "1", currency: "SAR" };
  c.places[1] = { ...c.places[1], estimatedCost: "900", currency: "SAR" };
  let count = 0;
  const result = await createJourneyAgent({ ai: { generate: async () => raw(c, count++ ? ["museum", "food"] : ["museum"]) } }).plan(c);
  assert.equal(result.report.checks.knownCostsWithinBudget, true);
  assert.equal(result.days[0].items.length, 1);
});

test("full regeneration preserves previously selected travel offers unless a cheaper search is requested", async () => {
  const repo = new MemoryRepository(), providers = createMockServices();
  const user = await repo.createUser({ name: "Test", email: "agent-retain@example.com" });
  const trip = await repo.createTrip(user.id, tripFixture());
  const planner = createTripPlannerService(repo, providers);
  const initial = await planner.generate(user.id, trip.id, { flightId: "mock-flight-2", hotelId: "mock-hotel-3" });
  const updated = await planner.generate(user.id, trip.id, { pace: "relaxed" }, initial);
  assert.equal(updated.flight.id, initial.flight.id); assert.equal(updated.hotel.id, initial.hotel.id);
  assert.equal(updated.version, 2);
});
