import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config/env.js";
import { createProviders } from "../src/providers/index.js";
import { createGoogleRoutesService } from "../src/services/googleRoutesService.js";
import { createMockRoutesService } from "./support/routeFixture.js";
import { createGooglePlacesService } from "../src/services/googlePlacesService.js";
import { tripFixture } from "./support/fixture.js";

const route = { origin: { latitude: 41, longitude: 29 }, destination: { latitude: 41.01, longitude: 29.02 } };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

test("Routes sends POST, explicit fields and ordered waypoints and normalizes seconds", async () => {
  const service = createGoogleRoutesService({ googleRoutesKey: "secret" }, async (url, options) => {
    assert.equal(url, "https://routes.googleapis.com/directions/v2:computeRoutes");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["X-Goog-Api-Key"], "secret");
    assert.ok(!options.headers["X-Goog-FieldMask"].includes("*"));
    const body = JSON.parse(options.body);
    assert.deepEqual(body.origin.location.latLng, route.origin);
    assert.deepEqual(body.intermediates[0].location.latLng, route.destination);
    assert.equal(body.routingPreference, undefined);
    return response({ routes: [{ distanceMeters: 100, duration: "90.5s", polyline: { encodedPolyline: "abc" }, legs: [{ distanceMeters: 100, duration: "90.5s" }] }] });
  });
  const result = await service.compute({ ...route, travelMode: "WALK", intermediates: [route.destination] });
  assert.equal(result.durationSeconds, 90.5);
  assert.equal(result.provider, "google");
  assert.equal(result.encodedPolyline, "abc");
});
test("Mock routes are explicit estimates and invalid coordinates fail", async () => {
  const service = createMockRoutesService();
  const result = await service.compute(route);
  assert.equal(result.isMock, true);
  assert.equal(result.encodedPolyline, null);
  assert.ok(result.distanceMeters > 0);
  await assert.rejects(() => service.compute({ ...route, origin: { latitude: 91, longitude: 0 } }));
  await assert.rejects(() => service.compute({ ...route, travelMode: "FLY" }));
});
test("Routes never silently replaces upstream failures or no-route responses", async () => {
  for (const status of [403, 429, 500]) {
    const service = createGoogleRoutesService({}, async () => response({}, status));
    await assert.rejects(() => service.compute(route), { code: "GOOGLE_ROUTES_UNAVAILABLE" });
  }
  await assert.rejects(() => createGoogleRoutesService({}, async () => response({ routes: [] })).compute(route), { code: "NO_ROUTE" });
  await assert.rejects(() => createGoogleRoutesService({}, async () => { throw new Error("timeout"); }).compute(route), { code: "GOOGLE_ROUTES_UNAVAILABLE" });
});
test("Places searches both attractions and restaurants without a food preference", async () => {
  const queries = [];
  const service = createGooglePlacesService({}, async (_, options) => {
    queries.push(JSON.parse(options.body).textQuery);
    return response({ places: [] });
  });
  await service.search(tripFixture({ interests: ["history"] }));
  assert.ok(queries.some((q) => q.startsWith("restaurants in ")));
  assert.ok(queries.some((q) => q.startsWith("tourist attractions in ")));
});

test("day editor includes all 40 unique Riyadh places across pages and categories", async () => {
  const queries = new Set();
  const service = createGooglePlacesService({}, async (_, options) => {
    const body = JSON.parse(options.body);
    queries.add(body.textQuery.split(" in ")[0]);
    assert.ok(options.headers["X-Goog-FieldMask"].includes("nextPageToken"));
    const offset = body.pageToken ? 20 : 0;
    return response({
      places: Array.from({ length: 20 }, (_, i) => ({
        id: String(offset + i), location: { latitude: 24.71, longitude: 46.68 }
      })),
      ...(!offset ? { nextPageToken: "page-two" } : {})
    });
  });
  const places = await service.search(tripFixture({ destination: "Riyadh", destinationCode: "RUH" }), { allPages: true });
  assert.equal(new Set(places.map(p => p.id)).size, 40);
  assert.equal(places.length, 40);
  for (const category of ["cafes", "museums", "family attractions", "shopping markets", "parks"]) {
    assert.ok(queries.has(category));
  }
});

test("Riyadh editor candidates lead with each selected interest before general places", async () => {
  const service = createGooglePlacesService({}, async (_, options) => {
    const category = JSON.parse(options.body).textQuery.split(" in ")[0];
    return response({ places: [1, 2].map(n => ({
      id: category + n, location: { latitude: 24.71, longitude: 46.68 }
    })) });
  });
  const search = async interests => (await service.search(tripFixture({
    destination: "Riyadh", destinationCode: "RUH", interests
  }))).map(p => p.id);
  assert.deepEqual((await search(["museums", "nature"])).slice(0, 4), ["museums1", "parks1", "museums2", "parks2"]);
  assert.equal((await search(["shopping"]))[0], "shopping markets1");
});

test("Places search covers requested interests with bounded calls and filters wrong-city/closed candidates", async () => {
  const bodies = [];
  const service = createGooglePlacesService({}, async (_, options) => {
    bodies.push(JSON.parse(options.body));
    return response({ places: [
      { id: "local", displayName: { text: "Local museum" }, location: { latitude: 41.01, longitude: 28.98 } },
      { id: "abroad", displayName: { text: "Istanbul Museum abroad" }, location: { latitude: 48, longitude: 2 } },
      { id: "closed", displayName: { text: "Closed museum" }, location: { latitude: 41.01, longitude: 28.98 }, businessStatus: "CLOSED_TEMPORARILY" },
    ] });
  });
  const places = await service.search(tripFixture({ interests: ["shopping", "nature", "cafes", "history", "family", "architecture"] }));
  assert.ok(bodies.length <= 6);
  assert.ok(bodies.some((body) => body.textQuery.startsWith("shopping markets")));
  assert.ok(bodies.every((body) => body.locationBias?.circle.radius === 35000));
  assert.deepEqual(places.map((p) => p.id), ["local"]);
});
