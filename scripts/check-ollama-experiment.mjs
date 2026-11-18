// Runs the real local model against explicit fixture data; it does not touch MySQL or travel APIs.
import { loadConfig } from "../backend/src/config/env.js";
import { createMockServices } from "../backend/tests/support/travelFixtures.js";
import { createOllamaPlanner } from "../backend/src/services/ollamaPlanner.js";
import { createMockRoutesService } from "../backend/tests/support/routeFixture.js";
import { createJourneyAgent } from "../backend/src/services/journeyAgent.js";
import { tripFixture } from "../backend/tests/support/fixture.js";
import { addDays } from "../backend/src/utils/dates.js";

const config = loadConfig({ ...process.env, AI_PROVIDER: "qwen" });
const fixtures = createMockServices();
const input = tripFixture({
  language: "ar",
  endDate: addDays(new Date().toISOString().slice(0, 10), 31),
  preferences: {
    pace: "relaxed",
    hotelStars: 3,
    flightOption: "cheapest",
    directPreferred: false,
    foodDaily: "80",
    transportDaily: "60",
    otherCosts: "100",
  },
});
input.startDate = addDays(new Date().toISOString().slice(0, 10), 30);
const [flight] = await fixtures.travel.flights(input);
const [hotel] = await fixtures.travel.hotels(input);
const places = await fixtures.places.search(input);
const providers = {
  ...fixtures,
  modes: { ...config.providerModes, routes: "mock" },
  routes: createMockRoutesService(),
  aiMode: "qwen",
  plannerMode: "qwen",
  ai: createOllamaPlanner(config),
};
const started = Date.now();
const result = await createJourneyAgent(providers).plan({ input, flight, hotel, places });
const activities = result.days.reduce((count, day) => count + day.items.length, 0);
if (result.days.length !== 2 || activities === 0) {
  throw new Error("The local model did not produce a valid two-day itinerary with activities.");
}
console.log(JSON.stringify({
  passed: true,
  model: config.ollamaModel,
  language: input.language,
  itineraryData: "fixtures; no external travel API calls",
  database: "not used",
  durationSeconds: Number(((Date.now() - started) / 1000).toFixed(1)),
  days: result.days.length,
  activities,
  agentStatus: result.report.status,
  stopReason: result.report.stopReason,
  checks: result.report.checks,
}, null, 2));
