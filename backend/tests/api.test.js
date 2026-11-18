import { createMockRoutesService } from "./support/routeFixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { testConfig as loadConfig } from "./support/config.js";
import { createMockServices } from "./support/travelFixtures.js";
import { MemoryRepository } from "./support/memoryRepository.js";
import { tripFixture } from "./support/fixture.js";
function setup(providers = createMockServices()) {
  providers.routes ||= createMockRoutesService();
  const repository = new MemoryRepository();
  return {
    repository,
    app: createApp({
      repository,
      providers,
      config: loadConfig({  }),
    }),
  };
}
async function register(app, email = "traveler@example.com") {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/auth/register")
    .send({
      name: "Test Traveler",
      email,
      password: "a-strong-test-password",
      language: "en",
    })
    .expect(201);
  return {
    agent,
    csrf: response.body.data.csrfToken,
    user: response.body.data.user,
  };
}
const mutate = (agent, method, url, csrf, body = {}) =>
  agent[method](url).set("X-CSRF-Token", csrf).send(body);

test("the editor searches the interests of the opened plan version", async () => {
  const providers = createMockServices();
  const { app, repository } = setup(providers);
  const { user, agent } = await register(app);
  const trip = await repository.createTrip(user.id, tripFixture({ interests: ["history"] }));
  const save = (interest) => repository.createPlan(user.id, trip.id, {
    input: { ...trip, interests: [interest] }, days: [],
  });
  const first = await save("museums"), second = await save("shopping");
  providers.places.search = async input => input.interests.map(id => ({ id }));
  for (const [plan, interest] of [[second, "shopping"], [first, "museums"]]) {
    const result = await agent.get(`/api/plans/${plan.id}/places`).expect(200);
    assert.deepEqual(result.body.data.places, [{ id: interest }]);
  }
  const other = await register(app, "other@example.com");
  await other.agent.get(`/api/plans/${second.id}/places`).expect(404);
});

test("booking link lookup requires authentication, CSRF and a valid offer id", async () => {
  const providers = createMockServices();
  let calls = 0;
  providers.flightBookingLinks = async (id) => { calls++; assert.equal(id, "offer-123"); return { options: [{ legs: ["outbound", "inbound"], links: [{ url: "https://airline.example/book", providerName: "Airline" }] }] }; };
  const { app } = setup(providers);
  await request(app).post("/api/flights/booking-links").send({offerId:"offer-123"}).expect(401);
  const { agent, csrf } = await register(app);
  await agent.post("/api/flights/booking-links").send({offerId:"offer-123"}).expect(403);
  const invalid = await mutate(agent,"post","/api/flights/booking-links",csrf,{offerId:"https://evil.example"});
  assert.ok(invalid.status >= 400);
  const valid = await mutate(agent,"post","/api/flights/booking-links",csrf,{offerId:"offer-123"}).expect(200);
  assert.equal(valid.body.data.options[0].links[0].providerName,"Airline");
  assert.equal(calls,1);
});
test("registration, password hashing, session, CSRF, login and revocable logout", async () => {
  const { app, repository } = setup();
  await request(app).get("/api/auth/me").expect(401);
  const { agent, csrf, user } = await register(app);
  assert.equal(user.passwordHash, undefined);
  assert.match(repository.users.get(user.id).passwordHash, /^\$2[aby]\$/);
  await agent.get("/api/auth/me").expect(200);
  await agent.post("/api/trips").send(tripFixture()).expect(403);
  await agent
    .post("/api/trips")
    .set("Origin", "https://attacker.example")
    .set("X-CSRF-Token", csrf)
    .send(tripFixture())
    .expect(403);
  await mutate(agent, "post", "/api/auth/logout", csrf).expect(200);
  await agent.get("/api/auth/me").expect(401);
  await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: "incorrect-password" })
    .expect(401);
  const login = await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: "a-strong-test-password" })
    .expect(200);
  assert.notEqual(login.body.data.csrfToken, csrf);
  await request(app)
    .post("/api/auth/register")
    .send({
      name: "Duplicate",
      email: user.email,
      password: "a-strong-test-password",
    })
    .expect(409);
});
test("trip, search, generation, immutable day edits, favorites, versions and ownership", async () => {
  const { app } = setup(),
    a = await register(app),
    b = await register(app, "other@example.com");
  const trip = (
    await mutate(a.agent, "post", "/api/trips", a.csrf, tripFixture()).expect(
      201,
    )
  ).body.data;
  const id = trip.id;
  await b.agent.get(`/api/trips/${id}`).expect(404);
  await mutate(b.agent, "patch", `/api/trips/${id}`, b.csrf, {
    destination: "Paris",
  }).expect(404);
  await b.agent.get(`/api/flights/search?tripId=${id}`).expect(404);
  await b.agent.get(`/api/recommendations?tripId=${id}`).expect(404);
  const recommendations = (await a.agent.get(`/api/recommendations?tripId=${id}`).expect(200)).body.data;
  assert.equal(recommendations.flights.length, 3);
  assert.equal(recommendations.hotels.length, 3);
  assert.equal(recommendations.flights[0].recommendation.rank, 1);
  const flights = (
    await a.agent.get(`/api/flights/search?tripId=${id}`).expect(200)
  ).body.data;
  assert.equal(flights.mode, "mock");
  assert.equal(flights.offers.length, 3);
  await a.agent.get(`/api/hotels/search?tripId=${id}`).expect(200);
  await a.agent.get(`/api/places/search?tripId=${id}`).expect(200);
  const p = (
    await mutate(a.agent, "post", "/api/plans/generate", a.csrf, {
      tripId: id,
      flightId: recommendations.flights[1].id,
      hotelId: recommendations.hotels[1].id,
    }).expect(201)
  ).body.data;
  assert.equal(p.days.length, 5);
  assert.equal(p.version, 1);
  const dayRoute = await mutate(a.agent, "post", `/api/plans/${p.id}/days/2/route`, a.csrf, { travelMode: "WALK" }).expect(200);
  assert.equal(dayRoute.body.data.route.provider, "mock");
  assert.deepEqual(dayRoute.body.data.placeIds, p.days[1].items.map((item) => item.placeId));
  await mutate(b.agent, "post", `/api/plans/${p.id}/days/2/route`, b.csrf).expect(404);
  await mutate(a.agent, "post", `/api/plans/${p.id}/days/22/route`, a.csrf).expect(404);
  assert.deepEqual((await a.agent.get(`/api/plans/${p.id}`)).body.data.days, p.days);

  assert.equal(p.flight.id, recommendations.flights[1].id);
  assert.equal(p.hotel.id, recommendations.hotels[1].id);
  assert.equal(p.agent.mode, "bounded");
  assert.equal(p.agent.selectedFlightId, p.flight.id);
  assert.ok(p.agent.attempts.length <= 3);
  const persistedAgentPlan = (await a.agent.get(`/api/plans/${p.id}`).expect(200)).body.data;
  assert.deepEqual(persistedAgentPlan.agent, p.agent);
  assert.ok(p.warnings.includes("DEVELOPMENT_FIXTURES"));
  await b.agent.get(`/api/plans/${p.id}`).expect(404);
  await mutate(b.agent, "post", `/api/plans/${p.id}/favorite`, b.csrf).expect(
    404,
  );
  await mutate(b.agent, "patch", `/api/plans/${p.id}/budget`, b.csrf, {
    totalBudget: "1",
  }).expect(404);
  await mutate(a.agent, "post", `/api/plans/${p.id}/favorite`, a.csrf).expect(
    200,
  );
  assert.equal((await a.agent.get("/api/favorites")).body.data.length, 1);
  assert.equal((await b.agent.get("/api/favorites")).body.data.length, 0);
  const regenerated = (
    await mutate(
      a.agent,
      "post",
      `/api/plans/${p.id}/days/2/regenerate`,
      a.csrf,
      { pace: "relaxed" },
    ).expect(201)
  ).body.data;
  assert.equal(regenerated.version, 2);
  assert.deepEqual(regenerated.days[0], p.days[0]);
  assert.deepEqual(regenerated.days[2], p.days[2]);
  assert.ok(regenerated.days[1].items.length <= 2);
  const original = (await a.agent.get(`/api/plans/${p.id}`)).body.data;
  assert.deepEqual(original.days, p.days);
  assert.equal(original.isSelected, false);
  const rawDay = {
    dayNumber: 2,
    date: regenerated.days[1].date,
    items: regenerated.days[1].items.slice(1).map(({ place, ...item }) => item),
  };
  const edited = (
    await mutate(
      a.agent,
      "patch",
      `/api/plans/${regenerated.id}/days/2`,
      a.csrf,
      rawDay,
    ).expect(201)
  ).body.data;
  assert.equal(edited.version, 3);
  assert.equal(edited.days[1].items.length, rawDay.items.length);
  const budget = (
    await mutate(a.agent, "patch", `/api/plans/${edited.id}/budget`, a.csrf, {
      totalBudget: "100",
    }).expect(201)
  ).body.data;
  assert.equal(budget.budget.overBudget, true);
  assert.equal(budget.version, 4);
  const full = (
    await mutate(
      a.agent,
      "post",
      `/api/plans/${budget.id}/regenerate`,
      a.csrf,
      { cheaper: true },
    ).expect(201)
  ).body.data;
  assert.equal(full.version, 5);
  assert.ok(
    full.flight.bookingUrl.startsWith("https://www.google.com/travel/flights"),
  );
  assert.equal(full.flight.bookingLinkType, "provider_search");
  const all = (await a.agent.get(`/api/trips/${id}`)).body.data;
  assert.equal(all.plans.length, 5);
  await mutate(b.agent, "delete", `/api/plans/${p.id}`, b.csrf).expect(404);
  await mutate(a.agent, "delete", `/api/trips/${id}`, a.csrf).expect(200);
  await a.agent.get(`/api/plans/${p.id}`).expect(404);
});
test("provider failure preserves trip and returns available independent results", async () => {
  const providers = createMockServices();
  providers.travel.flights = async () => {
    const e = new Error("Flight search unavailable");
    e.code = "AMADEUS_UNAVAILABLE";
    throw e;
  };
  const { app } = setup(providers),
    a = await register(app),
    trip = (await mutate(a.agent, "post", "/api/trips", a.csrf, tripFixture()))
      .body.data;
  const response = await mutate(
    a.agent,
    "post",
    "/api/plans/generate",
    a.csrf,
    { tripId: trip.id },
  ).expect(502);
  assert.equal(response.body.error.details.tripId, trip.id);
  assert.ok(response.body.error.details.available.hotels.length);
  await a.agent.get(`/api/trips/${trip.id}`).expect(200);
});
test("AI failure preserves original trip and never persists unvalidated output", async () => {
  const providers = createMockServices();
  let attempts = 0;
  providers.ai.generate = async () => { attempts++; return ({
    selectedFlightId: "invented",
    selectedHotelId: "invented",
    days: [],
  }); };
  const { app } = setup(providers),
    a = await register(app),
    trip = (await mutate(a.agent, "post", "/api/trips", a.csrf, tripFixture()))
      .body.data;
  await mutate(a.agent, "post", "/api/plans/generate", a.csrf, {
    tripId: trip.id,
  }).expect(422);
  assert.equal(attempts, 3);
  assert.equal(
    (await a.agent.get(`/api/trips/${trip.id}`)).body.data.plans.length,
    0,
  );
});
test("Arabic preferences and contact validation are persisted", async () => {
  const { app, repository } = setup(),
    a = await register(app);
  const profile = await mutate(a.agent, "patch", "/api/users/me", a.csrf, {
    language: "ar",
  }).expect(200);
  assert.equal(profile.body.data.language, "ar");
  await mutate(a.agent, "patch", "/api/users/me/preferences", a.csrf, {
    hotelStars: 4,
    flightOption: "shortest",
    pace: "relaxed",
    currency: "USD",
    interests: ["history", "culture"],
  }).expect(200);
  assert.equal(
    (await a.agent.get("/api/users/me/preferences")).body.data.currency,
    "USD",
  );
  await request(app)
    .post("/api/contact")
    .send({
      name: "Test",
      email: "not-email",
      subject: "Test",
      message: "Hello there!",
    })
    .expect(422);
  await request(app)
    .post("/api/contact")
    .send({
      name: "Test",
      email: "hello@example.com",
      subject: "Question",
      message: "Please help me plan this trip.",
    })
    .expect(201);
  assert.equal(repository.contacts.length, 1);
});

test("routes API requires authentication, CSRF and valid coordinates", async () => {
  const { app } = setup();
  const body = { origin: { latitude: 41, longitude: 29 }, destination: { latitude: 41.02, longitude: 29.03 } };
  await request(app).post("/api/routes/compute").send(body).expect(401);
  const { agent, csrf } = await register(app);
  await agent.post("/api/routes/compute").send(body).expect(403);
  const result = await mutate(agent, "post", "/api/routes/compute", csrf, body).expect(200);
  assert.equal(result.body.data.isMock, true);
  await mutate(agent, "post", "/api/routes/compute", csrf, { ...body, destination: { latitude: 200, longitude: 0 } }).expect(422);
});
