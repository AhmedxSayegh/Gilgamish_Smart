// One-origin production server. The completed API is composed without changing it.
import express from "express";
import helmet from "helmet";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { loadConfig } from "../backend/src/config/env.js";
import { createDatabase } from "../backend/src/config/database.js";
import { MysqlRepository } from "../backend/src/repositories/mysqlRepository.js";
import { createProviders } from "../backend/src/providers/index.js";
import { createApp } from "../backend/src/app.js";
const config = loadConfig(),
  pool = createDatabase(config);
const repository = new MysqlRepository(pool);
await repository.ping();
const apiApp = createApp({
  repository,
  providers: createProviders(config),
  config,
});
const directory = resolve(
  fileURLToPath(new URL("../frontend/dist", import.meta.url)),
);
await access(resolve(directory, "index.html"));
const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use((req, res, next) =>
  req.path === "/api" || req.path.startsWith("/api/")
    ? apiApp(req, res, next)
    : next(),
);
app.use(express.static(directory, { index: false }));
app.get("/{*path}", (req, res) => {
  if (req.path.includes(".")) return res.status(404).end();
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(resolve(directory, "index.html"));
});
const server = app.listen(config.port, () =>
  console.log(
    `Gilgamish Smart listening on ${config.port} (${config.mock ? "mock" : "live"} providers)`,
  ),
);
const shutdown = () =>
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
