import { loadConfig } from "../backend/src/config/env.js";

try {
  const config = loadConfig();
  const rows = Object.entries(config.providerModes).map(([service, provider]) => ({ service, provider,
    state: provider === "demo" ? "fixed demo city catalog; no API key" : provider === "mock" ? "fixture data" : provider === "rules" ? "local planning rules; no language model or key" : "configured; live request not yet verified" }));
  console.table(rows);
  console.log("Planner model:", config.ollamaModel);
} catch (error) { console.error(`Configuration check failed: ${error.message}`); process.exitCode = 1; }
