import { loadConfig } from "../backend/src/config/env.js";
import { createGoogleRoutesService } from "../backend/src/services/googleRoutesService.js";
const config = loadConfig();
try {
  const result = await createGoogleRoutesService(config).compute({ origin: { latitude: 41.0086, longitude: 28.9802 }, destination: { latitude: 41.0115, longitude: 28.9834 }, travelMode: "WALK" });
  console.log(JSON.stringify({ status: "ok", provider: result.provider, durationSeconds: result.durationSeconds, legCount: result.legs.length }));
} catch (error) { console.log(JSON.stringify({ status: "unverified", code: error.code, upstreamStatus: error.details?.upstreamStatus })); process.exitCode = 1; }
