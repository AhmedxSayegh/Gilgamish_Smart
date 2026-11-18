import { loadConfig } from "../backend/src/config/env.js";
const config = loadConfig();
// Only non-secret settings used by the desktop launcher.
console.log(JSON.stringify({ port: config.port, origin: config.clientOrigin, ai: config.aiProvider, modes: config.providerModes }));
