import test from "node:test";
import assert from "node:assert/strict";
import { recommendOffers } from "../src/services/recommendationService.js";
import { tripFixture } from "./support/fixture.js";

const flight = (id, price, extra = {}) => ({ id, price, currency: "SAR", stops: 0, returnStops: 0, durationMinutes: 300, ...extra });
const hotel = (id, price, extra = {}) => ({ id, price, currency: "SAR", stars: 3, ...extra });
test("returns at most three distinct valid offers in requested currency without modifying candidates", () => {
  const input = tripFixture();
  const candidates = { flights: [flight("d", "400"), flight("a", "100"), flight("b", "200"), flight("c", "300"), flight("a", "100"), flight("bad", "oops"), flight("usd", "1", { currency: "USD" })], hotels: [hotel("h", "100")] };
  const before = structuredClone(candidates);
  const result = recommendOffers(candidates, input);
  assert.deepEqual(result.flights.map(f => f.id), ["a", "b", "c"]);
  assert.deepEqual(result.flights.map(f => f.recommendation.rank), [1, 2, 3]);
  assert.deepEqual(candidates, before);
});
test("honors direct flights, duration and hotel star preference; missing metadata ranks last", () => {
  const input = tripFixture();
  input.preferences.directPreferred = true;
  input.preferences.flightOption = "shortest";
  input.preferences.hotelStars = 5;
  const result = recommendOffers({ flights: [flight("cheap", "100", { stops: 1 }), flight("slow", "200", { durationMinutes: 400 }), flight("fast", "300"), flight("unknown", "50", { returnStops: undefined })], hotels: [hotel("cheap", "100"), hotel("match", "300", { stars: 5 }), hotel("unknown", "50", { stars: null })] }, input);
  assert.deepEqual(result.flights.map(f => f.id), ["fast", "slow", "cheap"]);
  assert.equal(result.hotels[0].id, "match");
  assert.equal(result.hotels[2].id, "unknown");
});
test("budget includes all travelers and daily allowances before preference ranking", () => {
  const input = tripFixture({ totalBudget: "1500" });
  input.preferences.directPreferred = true;
  const result = recommendOffers({ flights: [flight("expensive", "600"), flight("affordable", "100", { stops: 1 })], hotels: [hotel("h", "100")] }, input);
  assert.equal(result.flights[0].id, "affordable");
  assert.equal(result.flights[0].recommendation.overBudget, false);
  assert.equal(result.flights[1].recommendation.overBudget, true);
});
test("does not invent alternatives or claim affordability when a category is empty", () => {
  const result = recommendOffers({ flights: [flight("a", "100")], hotels: [] }, tripFixture());
  assert.equal(result.flights.length, 1);
  assert.deepEqual(result.hotels, []);
  assert.equal(result.flights[0].recommendation.overBudget, null);
});
