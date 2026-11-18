// Explicit opt-in, dedicated test DB only. Upstream hotel data is controlled; no paid calls.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import request from "supertest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/config/database.js";
import { MysqlRepository } from "../src/repositories/mysqlRepository.js";
import { createApp } from "../src/app.js";
import { createMockServices } from "./support/travelFixtures.js";
import { createMockRoutesService } from "./support/routeFixture.js";
import { createRuleBasedPlanner } from "../src/services/ruleBasedPlanner.js";
import { createSerpapiHotelsService } from "../src/services/serpapiHotelsService.js";
import { tripFixture } from "./support/fixture.js";
import { addDays } from "../src/utils/dates.js";

test("MySQL preserves SerpApi hotel tokens/prices and saved-plan booking context", async () => {
  const name = process.env.TEST_DB_NAME;
  assert.match(name || "", /^gilgamish_test(?:_[a-z0-9]+)?$/);
  const config = loadConfig({ ...process.env, DB_NAME: name });
  const pool = createDatabase(config),
    repository = new MysqlRepository(pool);
  let userId;
  try {
    const sql = await readFile(
      new URL("../../database/schema.sql", import.meta.url),
      "utf8",
    );
    for (const statement of sql
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean))
      await pool.query(statement);
    const token = "CgoI_" + "x".repeat(200),
      requests = [];
    const hotels = createSerpapiHotelsService(
      { ...config, serpapiKey: "mysql-fixture-key" },
      async (url) => {
        const query = new URL(url).searchParams;
        requests.push({
          token: query.get("property_token"),
          startDate: query.get("check_in_date"),
        });
        const hotel = {
          property_token: token,
          name: "SQL test hotel",
          total_rate: { extracted_after_taxes_fees: 500 },
          rate_per_night: { extracted_lowest: 125 },
          gps_coordinates: { latitude: 41.01, longitude: 28.98 },
          extracted_hotel_class: 4,
        };
        return new Response(
          JSON.stringify(
            query.has("property_token")
              ? {
                  ...hotel,
                  prices: [
                    {
                      source: "SQL seller",
                      link: "https://seller.example/book",
                      total_rate: { extracted_lowest: 510 },
                    },
                  ],
                }
              : { properties: [hotel] },
          ),
          { status: 200 },
        );
      },
    );
    const providers = createMockServices();
    providers.travel.hotels = hotels.hotels;
    Object.assign(providers, {
      hotels,
      routes: createMockRoutesService(),
      ai: createRuleBasedPlanner(),
      aiMode: "rules",
      plannerMode: "rules",
      modes: { hotels: "serpapi" },
    });
    const app = createApp({ repository, providers, config }),
      agent = request.agent(app);
    const registered = await agent
      .post("/api/auth/register")
      .send({
        name: "SQL hotel test",
        email: `sql-hotel-${randomUUID()}@example.invalid`,
        password: "sql-hotel-test-password",
      })
      .expect(201);
    userId = registered.body.data.user.id;
    const csrf = registered.body.data.csrfToken;
    const trip = (
      await agent
        .post("/api/trips")
        .set("X-CSRF-Token", csrf)
        .send(tripFixture())
        .expect(201)
    ).body.data;
    const offers = (
      await agent.get(`/api/recommendations?tripId=${trip.id}`).expect(200)
    ).body.data;
    const selected = offers.hotels[0];
    const plan = (
      await agent
        .post("/api/plans/generate")
        .set("X-CSRF-Token", csrf)
        .send({
          tripId: trip.id,
          hotelId: selected.id,
          flightId: offers.flights[0].id,
        })
        .expect(201)
    ).body.data;
    const reloaded = await new MysqlRepository(pool).getPlan(userId, plan.id);
    assert.equal(reloaded.hotel.propertyToken, token);
    assert.equal(reloaded.hotel.price, "500.00");
    assert.equal(reloaded.hotel.taxesIncluded, true);
    assert.ok(reloaded.hotel.providerHotelId.length <= 100);
    assert.equal(reloaded.hotel.id, selected.id);
    await repository.updateTrip(
      userId,
      trip.id,
      tripFixture({
        startDate: addDays(trip.startDate, 2),
        endDate: addDays(trip.endDate, 2),
      }),
    );
    const booking = await agent
      .get(`/api/hotels/${token}/booking-links?planId=${plan.id}`)
      .expect(200);
    assert.equal(booking.body.data.links[0].source, "SQL seller");
    assert.equal(requests.at(-1).startDate, trip.startDate);
    assert.equal(requests.at(-1).token, token);
    const [rows] = await pool.execute(
      "SELECT provider, provider_hotel_id FROM selected_hotels WHERE travel_plan_id=?",
      [plan.id],
    );
    assert.equal(rows[0].provider, "serpapi");
    assert.equal(rows[0].provider_hotel_id, reloaded.hotel.providerHotelId);
  } finally {
    if (userId) await pool.execute("DELETE FROM users WHERE id=?", [userId]);
    await pool.end();
  }
});
