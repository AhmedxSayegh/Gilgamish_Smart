import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});
export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  const mock = env.USE_MOCK_SERVICES !== "false";
  if (production && !env.CLIENT_ORIGIN?.startsWith("https://"))
    throw new Error("Production requires an HTTPS CLIENT_ORIGIN.");
  const config = {
    production,
    mock,
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
    amadeusBase:
      env.AMADEUS_ENV === "production"
        ? "https://api.amadeus.com"
        : "https://test.api.amadeus.com",
    amadeusId: env.AMADEUS_CLIENT_ID,
    amadeusSecret: env.AMADEUS_CLIENT_SECRET,
    googleKey: env.GOOGLE_PLACES_API_KEY,
    aiKey: env.AI_API_KEY,
    aiModel: env.AI_MODEL || "gpt-4.1-mini",
    aiBase: env.AI_BASE_URL || "https://api.openai.com/v1",
  };
  if (!mock) {
    for (const [key, value] of Object.entries({
      AMADEUS_CLIENT_ID: config.amadeusId,
      AMADEUS_CLIENT_SECRET: config.amadeusSecret,
      GOOGLE_PLACES_API_KEY: config.googleKey,
      AI_API_KEY: config.aiKey,
    })) {
      if (!value)
        throw new Error(`${key} is required when USE_MOCK_SERVICES=false.`);
    }
    if (!config.aiBase.startsWith("https://"))
      throw new Error("AI_BASE_URL must use HTTPS.");
  }
  return config;
}
