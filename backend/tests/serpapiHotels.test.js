import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  createSerpapiHotelsService,
  safeHotelUrl,
} from "../src/services/serpapiHotelsService.js";
import { createProviders } from "../src/providers/index.js";
import { testConfig as loadConfig } from "./support/config.js";
import { createApp } from "../src/app.js";
import { createMockServices } from "./support/travelFixtures.js";
import { createMockRoutesService } from "./support/routeFixture.js";
import { MemoryRepository } from "./support/memoryRepository.js";
import { tripFixture } from "./support/fixture.js";
import { addDays } from "../src/utils/dates.js";

const secret = "test-serpapi-secret";
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), { status });
const property = (patch = {}) => ({
  property_token: "CgoI_TestHotel_123",
  name: "Test Hotel",
  type: "hotel",
  description: "An observed hotel",
  gps_coordinates: { latitude: 41.01, longitude: 28.98 },
  hotel_class: "4-star hotel",
  extracted_hotel_class: 4,
  overall_rating: 4.5,
  total_rate: { extracted_lowest: 460, extracted_after_taxes_fees: 500 },
  rate_per_night: { extracted_lowest: 115, extracted_after_taxes_fees: 125 },
  link: "https://hotel.example/",
  amenities: ["Wi-Fi"],
  ...patch,
});
const config = (patch) => ({
  serpapiKey: secret,
  serpapiDailyLimit: 100,
  serpapiMinuteLimit: 20,
  serpapiConcurrency: 2,
  ...patch,
});

test("SerpApi normalizes full-stay prices, missing prices, stable IDs, city disambiguation and currency", async () => {
  const urls = [],
    input = tripFixture();
  const api = createSerpapiHotelsService(config(), async (url, options) => {
    urls.push(new URL(url));
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    return response({
      properties: [
        property(),
        property(),
        null,
        property({ property_token: "nightlyOnly", total_rate: undefined }),
        property({
          property_token: "noRate",
          total_rate: { extracted_lowest: -1 },
        }),
        property({
          property_token: "fallbackPrice",
          total_rate: { extracted_lowest: 400 },
          extracted_hotel_class: undefined,
          hotel_class: undefined,
        }),
      ],
      search_metadata: {
        json_endpoint: `https://serpapi.com/?api_key=${secret}`,
      },
    });
  });
  const [hotel, fallback] = await api.hotels(input);
  assert.equal(hotel.price, "500.00");
  assert.equal(hotel.nightlyPrice, "125.00");
  assert.equal(hotel.priceScope, "one_room_full_stay");
  assert.equal(hotel.currency, "SAR");
  assert.equal(hotel.taxesIncluded, true);
  assert.equal(hotel.stars, 4);
  assert.equal(fallback.stars, null);
  assert.equal(fallback.taxesIncluded, null);
  assert.equal(fallback.price, "400.00");
  assert.ok(Date.parse(hotel.expiresAt) > Date.parse(hotel.observedAt));
  assert.equal((await api.hotels(input))[0].id, hotel.id);
  assert.equal(urls.length, 1);
  assert.equal(urls[0].origin, "https://serpapi.com");
  assert.equal(urls[0].searchParams.get("api_key"), secret);
  for (const [key, value] of Object.entries({
    engine: "google_hotels",
    check_in_date: input.startDate,
    check_out_date: input.endDate,
    currency: "SAR",
    adults: "2",
    children: "0",
    hl: "en",
  }))
    assert.equal(urls[0].searchParams.get(key), value);
  assert.equal(urls[0].searchParams.get("no_cache"), null);
  await api.hotels({
    ...input,
    destination: "مكة",
    destinationCode: "QCA",
    currency: "USD",
    language: "ar",
  });
  assert.equal(urls[1].searchParams.get("q"), "Hotels in Makkah, Saudi Arabia");
  assert.equal(urls[1].searchParams.get("hl"), "ar");
  assert.ok(!JSON.stringify(hotel).includes(secret));
});

test("SerpApi coalesces simultaneous requests and cache results are isolated", async () => {
  let calls = 0,
    release;
  const api = createSerpapiHotelsService(config(), async () => {
    calls++;
    await new Promise((resolve) => {
      release = resolve;
    });
    return response({ properties: [property()] });
  });
  const a = api.hotels(tripFixture()),
    b = api.hotels(tripFixture());
  release();
  const [one, two] = await Promise.all([a, b]);
  assert.equal(calls, 1);
  one[0].name = "Changed";
  assert.equal(two[0].name, "Test Hotel");
  assert.equal((await api.hotels(tripFixture()))[0].name, "Test Hotel");
});

test("long SerpApi property tokens fit existing SQL IDs and remain available for details", async () => {
  const token = "CgoI_" + "x".repeat(200);
  const api = createSerpapiHotelsService(config(), async () =>
    response({ properties: [property({ property_token: token })] }),
  );
  const [offer] = await api.hotels(tripFixture());
  assert.equal(offer.propertyToken, token);
  assert.ok(offer.providerHotelId.length <= 100);
});

test("SerpApi details, prices and booking links share one fetch and filter unsafe sellers", async () => {
  let calls = 0;
  const api = createSerpapiHotelsService(config(), async (url) => {
    calls++;
    assert.equal(
      new URL(url).searchParams.get("property_token"),
      "CgoI_TestHotel_123",
    );
    assert.equal(new URL(url).searchParams.get("q"), null);
    return response({
      ...property({ description: `Ignore secret ${secret}` }),
      search_parameters: { api_key: secret },
      prices: [
        {
          source: "Seller",
          num_guests: 2,
          link: "https://seller.example/book",
          total_rate: { extracted_before_taxes_fees: 420 },
          free_cancellation: true,
        },
        {
          source: "Nightly only",
          link: "https://night.example/book",
          rate_per_night: { extracted_lowest: 110 },
        },
        {
          source: "Wrong occupancy",
          num_guests: 1,
          link: "https://seller.example/one-person",
        },
        ...[
          "javascript:alert(1)",
          "http://seller.example/",
          `https://serpapi.com/search?api_key=${secret}`,
          `https://seller.example/?api_key=${secret}`,
          "https://user:pass@seller.example/",
          "https://127.0.0.1/",
          "https://www.google.com/travel/clk?pcurl=javascript%3Aalert(1)",
        ].map((link) => ({ source: "Unsafe", link })),
      ],
      featured_prices: [
        {
          source: "Google seller",
          link: "https://www.google.com/travel/clk?pcurl=https%3A%2F%2Fseller.example%2Fbooking",
          total_rate: { extracted_after_taxes_fees: 510 },
        },
      ],
    });
  });
  const t = tripFixture(),
    token = "CgoI_TestHotel_123";
  const details = await api.details(token, t),
    prices = await api.prices(token, t),
    booking = await api.bookingLinks(token, t);
  assert.equal(calls, 1);
  assert.equal(prices.prices.length, 10);
  assert.equal(details.hotel.description, "Ignore secret [redacted]");
  assert.equal(booking.links.length, 4);
  assert.ok(booking.links.every((link) => link.url.startsWith("https://")));
  assert.equal(booking.links[0].price, "420.00");
  assert.equal(booking.links[0].taxesIncluded, false);
  assert.equal(booking.links[1].price, null);
  assert.equal(booking.links[1].nightlyPrice, "110.00");
  assert.equal(booking.links.at(-1).type, "property_website");
  assert.ok(!JSON.stringify([details, prices, booking]).includes(secret));
  assert.equal(booking.hotel.provider, "serpapi");
});

test("SerpApi rejects invalid inputs and unsupported child occupancy before any upstream request", async () => {
  let calls = 0;
  const api = createSerpapiHotelsService(config(), async () => {
    calls++;
    return response({ properties: [] });
  });
  for (const patch of [
    { startDate: "2026-02-30" },
    { endDate: "2000-01-01" },
    { adults: 0 },
    { adults: 10 },
    { currency: "XYZ" },
    { language: "bad" },
    { destination: "x" },
  ])
    await assert.rejects(() => api.hotels({ ...tripFixture(), ...patch }));
  await assert.rejects(() =>
    api.details("https://evil.example/", tripFixture()),
  );
  assert.equal(calls, 0);
  await api.hotels(tripFixture({ children: 1 }));
  assert.equal(calls, 1);
});

test("SerpApi safely classifies malformed JSON, provider errors, auth, network and timeout failures", async () => {
  const cases = [
    [async () => response({}, 401), "SERPAPI_AUTH_FAILED", 502],
    [async () => response({}, 500), "SERPAPI_UNAVAILABLE", 502],
    [
      async () => new Response("<html>error</html>"),
      "SERPAPI_UNAVAILABLE",
      502,
    ],
    [async () => response({ error: secret }), "SERPAPI_INVALID_RESPONSE", 502],
    [
      async () => response({ search_metadata: { status: "Error" } }),
      "SERPAPI_INVALID_RESPONSE",
      502,
    ],
    [async () => response({}), "SERPAPI_INVALID_RESPONSE", 502],
    [
      () => {
        throw new Error(`failed URL: api_key=${secret}`);
      },
      "SERPAPI_UNAVAILABLE",
      502,
    ],
    [
      async () => {
        throw new DOMException(secret, "TimeoutError");
      },
      "SERPAPI_TIMEOUT",
      504,
    ],
  ];
  for (const [fetchImpl, code, status] of cases) {
    const api = createSerpapiHotelsService(config(), fetchImpl);
    for (let i = 0; i < 2; i++)
      await assert.rejects(
        () => api.hotels(tripFixture()),
        (error) => {
          assert.equal(error.code, code);
          assert.equal(error.status, status);
          assert.ok(!JSON.stringify(error).includes(secret));
          assert.ok(!error.message.includes(secret));
          return true;
        },
      );
  }
  await assert.rejects(
    () => createSerpapiHotelsService({}).hotels(tripFixture()),
    { code: "SERPAPI_NOT_CONFIGURED" },
  );
});

test("SerpApi enforces minute/day budgets, counts failed attempts, resets UTC days and allows cache hits", async () => {
  let time = Date.now(),
    calls = 0;
  const t = tripFixture(),
    api = createSerpapiHotelsService(
      config({ serpapiDailyLimit: 2, serpapiMinuteLimit: 1 }),
      async () => {
        calls++;
        return response({ properties: [] });
      },
      () => time,
    );
  await api.hotels(t);
  await api.hotels(t);
  assert.equal(calls, 1);
  await assert.rejects(() => api.hotels({ ...t, language: "ar" }), {
    code: "HOTEL_QUOTA_EXCEEDED",
  });
  time += 61000;
  await api.hotels({ ...t, language: "ar" });
  time += 61000;
  await assert.rejects(() => api.hotels({ ...t, currency: "USD" }), {
    code: "HOTEL_QUOTA_EXCEEDED",
  });
  time += 86400000;
  await api.hotels({ ...t, currency: "USD" });
  assert.equal(calls, 3);
  const failing = createSerpapiHotelsService(
    config({ serpapiDailyLimit: 1 }),
    async () => response({}, 500),
  );
  await assert.rejects(() => failing.hotels(t), {
    code: "SERPAPI_UNAVAILABLE",
  });
  await assert.rejects(() => failing.hotels(t), {
    code: "HOTEL_QUOTA_EXCEEDED",
  });
});

test("SerpApi bounds concurrent calls, recovers after completion and cools down after upstream 429", async () => {
  let release;
  const t = tripFixture(),
    api = createSerpapiHotelsService(
      config({ serpapiConcurrency: 1 }),
      async () => {
        await new Promise((resolve) => {
          release = resolve;
        });
        return response({ properties: [] });
      },
    );
  const first = api.hotels(t);
  await assert.rejects(() => api.hotels({ ...t, language: "ar" }), {
    code: "HOTEL_SEARCH_BUSY",
  });
  release();
  await first;
  const second = api.hotels({ ...t, language: "ar" });
  release();
  await second;
  let calls = 0,
    time = Date.now();
  const limited = createSerpapiHotelsService(
    config(),
    async () => {
      calls++;
      return calls === 1 ? response({}, 429) : response({ properties: [] });
    },
    () => time,
  );
  await assert.rejects(() => limited.hotels(t), {
    code: "SERPAPI_RATE_LIMITED",
  });
  await assert.rejects(() => limited.hotels(t), {
    code: "SERPAPI_RATE_LIMITED",
  });
  assert.equal(calls, 1);
  time += 61000;
  await limited.hotels(t);
  assert.equal(calls, 2);
});

test("SerpApi URL sanitization blocks credentials, API hosts, nested redirects and encoded keys", () => {
  for (const url of [
    "https://serpapi.com/",
    "https://api.serpapi.com/",
    "https://localhost/a",
    "https://192.168.1.1/",
    "https://[::1]/",
    "https://seller.example:8443/",
    "https://seller.example/?API_KEY=redacted",
    `https://seller.example/?x=${encodeURIComponent(encodeURIComponent(secret))}`,
    "https://www.google.com/url?url=https%3A%2F%2Fserpapi.com%2Fsearch",
    "https://www.google.com/travel/clk?pcurl=http%3A%2F%2Fseller.example",
  ])
    assert.equal(safeHotelUrl(url, secret), null);
  assert.ok(
    safeHotelUrl(
      "https://www.google.com/travel/clk?pcurl=https%3A%2F%2Fseller.example%2Fbook",
    ),
  );
});

test("configuration ignores supplied process SerpApi keys and validates spending limits", () => {
  const loaded = loadConfig({
    SERPAPI_API_KEY: "must-never-be-used",
  });
  assert.notEqual(loaded.serpapiKey, "must-never-be-used");
  for (const value of ["0", "-1", "bad", "2.5", "1001"])
    assert.throws(
      () => loadConfig({ SERPAPI_DAILY_LIMIT: value }),
      /SerpApi limits/,
    );
  assert.throws(
    () => loadConfig({ HOTELS_PROVIDER: "bad" }),
    /HOTELS_PROVIDER/,
  );
  assert.equal(loadConfig({}).serpapiDailyLimit, 100);
});

test("SerpApi provider selection preserves independent flight configuration", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).hostname, "serpapi.com");
    return response({ properties: [property()] });
  };
  try {
    const cfg = loadConfig({  });
    const providers = createProviders({
      ...cfg,
      ...config(),
      providerModes: { ...cfg.providerModes, hotels: "serpapi" },
    });
    assert.equal(providers.modes.flights, "ignav");
    assert.equal(providers.mode, "live");
    assert.equal(
      (await providers.travel.hotels(tripFixture()))[0].provider,
      "serpapi",
    );
    assert.equal(typeof providers.flightBookingLinks, "function");
  } finally {
    globalThis.fetch = original;
  }
});

async function setupApi() {
  const repository = new MemoryRepository(),
    providers = createMockServices();
  let calls = 0;
  const hotels = createSerpapiHotelsService(config(), async (url) => {
    calls++;
    const query = new URL(url).searchParams;
    return response(
      query.has("property_token")
        ? {
            ...property(),
            prices: [
              {
                source: "Seller",
                link: "https://seller.example/book",
                total_rate: { extracted_lowest: 500 },
              },
            ],
          }
        : { properties: [property()] },
    );
  });
  providers.hotels = hotels;
  providers.travel.hotels = hotels.hotels;
  providers.routes = createMockRoutesService();
  providers.modes = { hotels: "serpapi" };
  const app = createApp({
    repository,
    providers,
    config: loadConfig({  }),
  });
  const agent = request.agent(app),
    auth = await agent
      .post("/api/auth/register")
      .send({
        name: "Hotel Test",
        email: "hotel@example.com",
        password: "hotel-test-password",
      })
      .expect(201);
  const user = auth.body.data.user,
    csrf = auth.body.data.csrfToken;
  const trip = await repository.createTrip(user.id, tripFixture());
  return {
    app,
    agent,
    repository,
    providers,
    trip,
    user,
    csrf,
    calls: () => calls,
  };
}

test("hotel API protects ownership and validates tokens/context; all four endpoints work without exposing secrets", async () => {
  const ctx = await setupApi(),
    { app, agent, trip } = ctx;
  const base = "/api/hotels/CgoI_TestHotel_123",
    query = `?tripId=${trip.id}`;
  await request(app)
    .get(base + query)
    .expect(401);
  await agent.get(base + "?tripId=invalid").expect(422);
  await agent.get(base + query + "&api_key=attack").expect(422);
  await agent.get("/api/hotels/bad.token" + query).expect(422);
  await agent
    .get(base + "?tripId=00000000-0000-4000-8000-000000000001")
    .expect(404);
  assert.equal(ctx.calls(), 0);
  const search = await agent.get("/api/hotels/search" + query).expect(200);
  assert.equal(search.body.data.mode, "live");
  assert.equal(search.body.data.offers[0].provider, "serpapi");
  for (const suffix of ["", "/prices", "/booking-links"]) {
    const result = await agent.get(base + suffix + query).expect(200);
    assert.ok(!JSON.stringify(result.body).includes(secret));
    assert.equal(result.headers["cache-control"], "no-store");
  }
  assert.equal(ctx.calls(), 2);
  const outsider = await ctx.repository.createUser({ name: "Other" });
  const otherTrip = await ctx.repository.createTrip(outsider.id, tripFixture());
  await agent.get(base + `?tripId=${otherTrip.id}`).expect(404);
  assert.equal(ctx.calls(), 2);
});

test("hotel API retains saved-plan dates after trip edits and selected SerpApi offers survive generation", async () => {
  const { agent, repository, trip, user, csrf } = await setupApi();
  const recommendations = await agent
    .get(`/api/recommendations?tripId=${trip.id}`)
    .expect(200);
  const hotel = recommendations.body.data.hotels[0],
    flight = recommendations.body.data.flights[0];
  const generated = await agent
    .post("/api/plans/generate")
    .set("X-CSRF-Token", csrf)
    .send({ tripId: trip.id, hotelId: hotel.id, flightId: flight.id })
    .expect(201);
  const plan = generated.body.data;
  assert.equal(plan.hotel.id, hotel.id);
  assert.equal(plan.hotel.provider, "serpapi");
  await repository.updateTrip(
    user.id,
    trip.id,
    tripFixture({
      startDate: addDays(trip.startDate, 2),
      endDate: addDays(trip.endDate, 2),
    }),
  );
  const result = await agent
    .get(`/api/hotels/${hotel.providerHotelId}/booking-links?planId=${plan.id}`)
    .expect(200);
  assert.equal(result.body.data.hotel.checkIn, plan.input.startDate);
  await agent
    .get(
      `/api/hotels/${hotel.providerHotelId}?tripId=${trip.id}&planId=${plan.id}`,
    )
    .expect(422);
});

test("hotel API limits per-user requests and emits safe quota errors with retry headers", async () => {
  const ctx = await setupApi();
  for (let i = 0; i < 30; i++)
    await ctx.agent.get(`/api/hotels/search?tripId=${ctx.trip.id}`).expect(200);
  const limited = await ctx.agent
    .get(`/api/hotels/search?tripId=${ctx.trip.id}`)
    .expect(429);
  assert.equal(limited.body.error.code, "HOTEL_RATE_LIMITED");
  assert.ok(limited.headers["retry-after"]);
  assert.equal(ctx.calls(), 1);
  const other = await setupApi();
  other.providers.hotels = createSerpapiHotelsService(
    config({ serpapiDailyLimit: 1 }),
    async () => response({ ...property() }),
  );
  const base = `/api/hotels/CgoI_TestHotel_123?tripId=${other.trip.id}`;
  await other.agent.get(base).expect(200);
  const quota = await other.agent
    .get(`/api/hotels/anotherToken?tripId=${other.trip.id}`)
    .expect(429);
  assert.equal(quota.body.error.code, "HOTEL_QUOTA_EXCEEDED");
  assert.ok(quota.headers["retry-after"]);
});
