import test from "node:test";
import assert from "node:assert/strict";
import { createAmadeusService } from "../src/services/amadeusService.js";
import { createGooglePlacesService } from "../src/services/googlePlacesService.js";
import { createAiService } from "../src/services/aiService.js";
import { loadConfig } from "../src/config/env.js";
import { tripFixture } from "./support/fixture.js";
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("live mode fails fast without credentials and never substitutes fixtures", () =>
  assert.throws(
    () => loadConfig({ USE_MOCK_SERVICES: "false" }),
    /AMADEUS_CLIENT_ID/,
  ));
test("Amadeus caches tokens, sends round trip parameters, and normalizes both legs", async () => {
  let tokens = 0;
  const urls = [];
  const input = tripFixture();
  const fetchImpl = async (url, options) => {
    if (String(url).endsWith("/token")) {
      tokens++;
      assert.equal(options.method, "POST");
      return response({ access_token: "test-token", expires_in: 1800 });
    }
    urls.push(new URL(url));
    assert.equal(options.headers.Authorization, "Bearer test-token");
    return response({
      data: [
        {
          id: "F1",
          price: { grandTotal: "123.45", currency: "SAR" },
          itineraries: [
            {
              duration: "PT4H",
              segments: [
                {
                  carrierCode: "XX",
                  departure: {
                    iataCode: "JED",
                    at: `${input.startDate}T08:00:00`,
                  },
                  arrival: {
                    iataCode: "IST",
                    at: `${input.startDate}T12:00:00`,
                  },
                },
              ],
            },
            {
              duration: "PT4H",
              segments: [
                {
                  departure: {
                    iataCode: "IST",
                    at: `${input.endDate}T18:00:00`,
                  },
                  arrival: { iataCode: "JED", at: `${input.endDate}T22:00:00` },
                },
              ],
            },
          ],
        },
      ],
      dictionaries: { carriers: { XX: "Example" } },
    });
  };
  const api = createAmadeusService(
    {
      amadeusBase: "https://test.api.amadeus.com",
      amadeusId: "id",
      amadeusSecret: "secret",
    },
    fetchImpl,
  );
  const results = await Promise.all([
    api.flights(input),
    api.flights({ ...input, adults: 1 }),
  ]);
  assert.equal(tokens, 1);
  assert.equal(urls[0].searchParams.get("returnDate"), input.endDate);
  assert.equal(results[0][0].price, "123.45");
  assert.equal(results[0][0].returnDepartureTime, `${input.endDate}T18:00:00`);
  assert.equal(results[0][0].priceScope, "all_travelers_round_trip");
});
test("Amadeus exposes rate limits and unsupported child hotel occupancy", async () => {
  const api = createAmadeusService(
    {
      amadeusBase: "https://test.api.amadeus.com",
      amadeusId: "id",
      amadeusSecret: "secret",
    },
    async () => response({}, 429),
  );
  await assert.rejects(() => api.flights(tripFixture()), {
    code: "AMADEUS_UNAVAILABLE",
    status: 503,
  });
  await assert.rejects(() => api.hotels(tripFixture({ children: 1 })), {
    code: "HOTEL_CHILD_OCCUPANCY_UNSUPPORTED",
  });
});
test("Google Places requests explicit fields and leaves missing fees unknown", async () => {
  const api = createGooglePlacesService(
    { googleKey: "secret" },
    async (url, options) => {
      assert.ok(options.headers["X-Goog-FieldMask"].includes("places.id"));
      assert.ok(!options.headers["X-Goog-FieldMask"].includes("*"));
      assert.equal(JSON.parse(options.body).languageCode, "en");
      return response({
        places: [
          {
            id: "place-1",
            displayName: { text: "Museum" },
            types: ["museum"],
            rating: 4.6,
            location: { latitude: 41, longitude: 29 },
          },
        ],
      });
    },
  );
  const [place] = await api.search(tripFixture());
  assert.equal(place.name, "Museum");
  assert.equal(place.estimatedCost, null);
  assert.equal(place.openingHours, null);
  assert.equal(place.provider, "google");
});
test("external AI uses a strict schema and rejects truncation and invalid JSON", async () => {
  const config = {
    aiBase: "https://api.openai.com/v1",
    aiKey: "secret",
    aiModel: "test-model",
  };
  const api = createAiService(config, async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.store, false);
    return response({
      choices: [{ finish_reason: "length", message: { content: "{}" } }],
    });
  });
  await assert.rejects(() => api.generate({}), { code: "AI_INCOMPLETE" });
  const invalid = createAiService(config, async () =>
    response({
      choices: [{ finish_reason: "stop", message: { content: "not json" } }],
    }),
  );
  await assert.rejects(() => invalid.generate({}), { code: "AI_INVALID_JSON" });
});
