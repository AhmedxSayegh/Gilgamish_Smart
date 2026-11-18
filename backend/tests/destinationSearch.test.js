import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { searchRoutes } from "../src/routes/searchRoutes.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { AppError } from "../src/utils/errors.js";

function appFor(local, searchAirports) {
  const app = express();
  app.use(searchRoutes({ providers: { travel: { destinations: async () => local }, searchAirports }, generationLimiter: (req, res, next) => next() }));
  app.use(errorHandler);
  return app;
}

test("a provider outage does not discard known city matches", async () => {
  const cities = [{ code: "DAM", name: "Damascus" }];
  const app = appFor(cities, async () => { throw new AppError(502, "IGNAV_NETWORK_ERROR", "Unavailable"); });
  const response = await request(app).get("/destinations/search?q=damascus").expect(200);
  assert.deepEqual(response.body.data, cities);
});

test("a failed worldwide search is reported as an error rather than no matches", async () => {
  const app = appFor([], async () => { throw new AppError(502, "IGNAV_NETWORK_ERROR", "Unavailable"); });
  const response = await request(app).get("/destinations/search?q=london").expect(502);
  assert.equal(response.body.error.code, "IGNAV_NETWORK_ERROR");
});

test("successful worldwide searches still merge and deduplicate local cities", async () => {
  const app = appFor([{ code: "DAM", name: "Damascus" }], async () => [{ code: "DAM", name: "Airport" }, { code: "LHR", name: "London" }]);
  const response = await request(app).get("/destinations/search?q=city").expect(200);
  assert.deepEqual(response.body.data.map(city => city.code), ["DAM", "LHR"]);
});
