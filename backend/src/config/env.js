import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
const { parsed: backendFileEnv = {} } = dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});
export function loadConfig(env = process.env, fileEnv = backendFileEnv) {
  const production = env.NODE_ENV === "production";
  const defaults = { destinations: "demo", flights: "ignav", hotels: "serpapi", places: "google", routes: "google", ai: "qwen" };
  const providerModes = {};
  for (const [service, fallback] of Object.entries(defaults)) {
    const key = service.toUpperCase() + "_PROVIDER";
    const selected = env[key] || fallback;
    const allowed = service === "ai" ? ["rules", "qwen"] : [fallback];
    if (!allowed.includes(selected)) throw new Error(key + " must be one of: " + allowed.join(", "));
    providerModes[service] = selected;
  }
  if (production && !env.CLIENT_ORIGIN?.startsWith("https://"))
    throw new Error("Production requires an HTTPS CLIENT_ORIGIN.");
  const config = {
    production,
    mock: false,
    providerModes,
    aiProvider: providerModes.ai,
    ollamaBaseUrl: (env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, ""),
    ollamaModel: env.OLLAMA_MODEL || "qwen3:4b-instruct",
    ollamaTimeoutMs: Math.min(300000, Math.max(30000, Number(env.OLLAMA_TIMEOUT_MS || 180000))),
    googleRoutesKey: env.GOOGLE_ROUTES_API_KEY || env.GOOGLE_PLACES_API_KEY,
    port: Number(env.PORT || 4000),
    clientOrigin: env.CLIENT_ORIGIN || "http://localhost:5173",
    sessionDays: Number(env.SESSION_DAYS || 7),
    trustProxy: env.TRUST_PROXY === "true",
    db: {
      host: env.DB_HOST || "127.0.0.1",
      port: Number(env.DB_PORT || 3306),
      user: env.DB_USER || "gilgamish",
      password: env.DB_PASSWORD,
      database: env.DB_NAME || "gilgamish",
      ...(env.DB_SOCKET ? { socketPath: env.DB_SOCKET } : {}),
      ...(env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
    },
    ignavKey: env.IGNAV_API_KEY,
    googleKey: env.GOOGLE_PLACES_API_KEY,
    // Deliberately ignore inherited/root/frontend keys. Only backend/.env owns this secret.
    serpapiKey: fileEnv.SERPAPI_API_KEY?.trim(),
    serpapiDailyLimit: boundedInteger(env.SERPAPI_DAILY_LIMIT, 100, 1, 1000),
    serpapiMinuteLimit: boundedInteger(env.SERPAPI_MINUTE_LIMIT, 20, 1, 60),
    serpapiConcurrency: boundedInteger(env.SERPAPI_CONCURRENCY, 2, 1, 4),
  };
  if (providerModes.ai === "qwen") {
    let ollamaUrl;
    try { ollamaUrl = new URL(config.ollamaBaseUrl); } catch { throw new Error("OLLAMA_BASE_URL must be a local Ollama URL."); }
    if (ollamaUrl.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(ollamaUrl.hostname))
      throw new Error("OLLAMA_BASE_URL must use a loopback address; cloud model endpoints are not enabled in this experiment.");
  }
  const required = {};
  if (providerModes.routes === "google") required.GOOGLE_ROUTES_API_KEY = config.googleRoutesKey;
  if (providerModes.flights === "ignav") required.IGNAV_API_KEY = config.ignavKey;
  if (providerModes.hotels === "serpapi") required.SERPAPI_API_KEY = config.serpapiKey;
  if (providerModes.places === "google") required.GOOGLE_PLACES_API_KEY = config.googleKey;
  for (const [key, value] of Object.entries(required)) {
    if (!value?.trim()) throw new Error(`${key} is required by the selected provider.`);
  }
  return config;
}

function boundedInteger(value, fallback, min, max) {
  if (value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max)
    throw new Error(`SerpApi limits must be integers between ${min} and ${max}.`);
  return number;
}
