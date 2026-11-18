// Explicit live verification: two real Places searches per city; no travel booking or SQL writes.
// Retains only verification counts, never raw Google place content or API keys.
import { mkdir, writeFile } from "node:fs/promises";
import { loadConfig } from "../backend/src/config/env.js";
import { createGooglePlacesService } from "../backend/src/services/googlePlacesService.js";
import { demoCities } from "../shared/demoCities.mjs";

if (!process.argv.includes("--live")) throw new Error("Pass --live to verify the ten cities using the configured Google Places key.");
const config = loadConfig();
if (!config.googleKey?.trim()) throw new Error("GOOGLE_PLACES_API_KEY is required.");
let requestCount = 0;
const service = createGooglePlacesService(config, async (url, options) => {
  if (new URL(String(url)).hostname !== "places.googleapis.com") throw new Error("Unexpected provider host.");
  requestCount++;
  return fetch(url, options);
});
const cities = [];
for (const city of demoCities) {
  try {
    const places = await service.search({ destination: city.name, destinationCode: city.code, language: "ar", interests: [] });
    const valid = places.filter((p) => p.id && p.name && Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    cities.push({ code: city.code, name: city.name, ok: valid.length > 0, placeCount: valid.length });
  } catch (error) {
    cities.push({ code: city.code, name: city.name, ok: false, errorCode: error.code || "REQUEST_FAILED" });
  }
}
const summary = { checkedAt: new Date().toISOString(), source: "real Google Places service; attractions and restaurants; Arabic results; configured geographic filters", requestCount, cities,
  scope: "Basic place search only. Does not verify full itineraries, every interest, routes, flight/hotel inventory or booking availability." };
await mkdir(new URL("../docs/verification/", import.meta.url), { recursive: true });
await writeFile(new URL("../docs/verification/demo-cities.json", import.meta.url), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (cities.some((city) => !city.ok)) process.exitCode = 1;
