import test from "node:test";
import assert from "node:assert/strict";
import { demoCities, demoCityByCode, searchDemoCities } from "../../shared/demoCities.mjs";
import { cities as frontendCities } from "../../frontend/src/lib/assets.js";
import { createProviders } from "../src/providers/index.js";
import { testConfig as loadConfig } from "./support/config.js";
import { createMockServices } from "./support/travelFixtures.js";
import { createGooglePlacesService } from "../src/services/googlePlacesService.js";
import { createRuleBasedPlanner } from "../src/services/ruleBasedPlanner.js";
import { validateItinerary } from "../src/services/itineraryService.js";
import { tripFixture } from "./support/fixture.js";
const response = (data) => new Response(JSON.stringify(data));

test("the demo catalog and frontend contain exactly the ten requested cities", () => {
  const expected = ["DAM", "IST", "MED", "QCA", "JED", "RUH", "AMM", "DXB", "CAI", "PAR"];
  assert.deepEqual(demoCities.map((c) => c.code), expected);
  assert.deepEqual(frontendCities.map((c) => c.code), expected);
  assert.equal(new Set(demoCities.map((c) => c.code)).size, 10);
  assert.deepEqual(searchDemoCities("London"), []);
  assert.ok(frontendCities.every((c) => c.name && c.ar && c.image && c.countryAr));
});

test("every demo city is searchable in Arabic/English; aliases and Arabic spelling variants work", async () => {
  const p = createProviders(loadConfig({}));
  assert.equal(p.modes.destinations, "demo");
  for (const city of demoCities) {
    assert.ok((await p.travel.destinations(city.name)).some((c) => c.code === city.code));
    assert.ok((await p.travel.destinations(city.nameAr)).some((c) => c.code === city.code));
  }
  for (const [query, code] of [["اسطنبول", "IST"], ["المدينه المنوره", "MED"], ["مكه", "QCA"], ["عمان", "AMM"], ["Medina", "MED"], ["Mecca", "QCA"]]) {
    assert.ok(searchDemoCities(query).some((c) => c.code === code));
  }
});

test("all ten cities support rule-based demo planning with fixture travel offers", async () => {
  const fixtures = createMockServices(), planner = createRuleBasedPlanner();
  for (const city of demoCities) {
    const input = tripFixture({ origin: city.code === "DAM" ? "Istanbul" : "Damascus", originCode: city.code === "DAM" ? "IST" : "DAM", destination: city.name, destinationCode: city.code });
    const c = { input, flight: (await fixtures.travel.flights(input))[0], hotel: (await fixtures.travel.hotels(input))[0], places: await fixtures.places.search(input) };
    const days = validateItinerary(await planner.generate(c), c);
    if (city.code === "QCA") {
      const first = days[0].items[0];
      assert.equal(first.place.name, "Masjid al-Haram");
      assert.equal(first.startTime, "14:00");
      assert.equal(first.endTime, "17:00");
      for (const [arrival, start, end] of [["18:00","20:00","23:00"], ["20:30","22:30","01:30"], ["23:30","01:30","04:30"]]) {
        const late = { ...c, flight: { ...c.flight, arrivalTime: input.startDate + "T" + arrival + ":00" } };
        const [day] = validateItinerary(await planner.generate(late), late);
        assert.deepEqual(day.items.map(i => [i.place.name, i.startTime, i.endTime]), [["Masjid al-Haram", start, end]]);
      }
    }
    assert.ok(days.some((d) => d.items.length), city.name);
  }
});

test("Makkah stays a separate place/hotel destination while flights use Jeddah", async () => {
  const input = tripFixture({ origin: "Damascus", originCode: "DAM", destination: "Makkah", destinationCode: "QCA" });
  const fixtures = createMockServices();
  assert.equal((await fixtures.travel.flights(input))[0].destination, "JED");
  await assert.rejects(() => fixtures.travel.flights(tripFixture({ destination: "Makkah", destinationCode: "QCA", originCode: "JED" })), { code: "GROUND_TRANSFER_REQUIRED" });
});

test("Google searches disambiguate demo city/country and use the destination center, not the airport gateway", async () => {
  for (const code of ["MED", "QCA", "CAI", "AMM"]) {
    const city = demoCityByCode(code), bodies = [];
    const service = createGooglePlacesService({}, async (_, options) => { bodies.push(JSON.parse(options.body)); return response({ places: [] }); });
    await service.search(tripFixture({ destination: city.name, destinationCode: city.code }));
    assert.ok(bodies.every((b) => b.textQuery.endsWith(`${city.name}, ${city.country}`)));
    assert.ok(bodies.every((b) => b.locationBias.circle.center.longitude === city.longitude));
  }
});
