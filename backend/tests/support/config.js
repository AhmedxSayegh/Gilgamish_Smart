import { loadConfig } from "../../src/config/env.js";

export function testConfig(overrides = {}) {
  return loadConfig({ IGNAV_API_KEY: "test", GOOGLE_PLACES_API_KEY: "test", ...overrides }, { SERPAPI_API_KEY: "test" });
}
