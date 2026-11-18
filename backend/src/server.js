import { loadConfig } from "./config/env.js";
import { createDatabase } from "./config/database.js";
import { MysqlRepository } from "./repositories/mysqlRepository.js";
import { createProviders } from "./providers/index.js";
import { createApp } from "./app.js";
const config = loadConfig(),
  pool = createDatabase(config),
  repository = new MysqlRepository(pool);
try {
  await repository.ping();
  const providers = createProviders(config);
  const app = createApp({
    repository,
    providers,
    config,
  });
  const server = app.listen(config.port, () =>
    console.log(
      `Gilgamish Smart API listening on port ${config.port}; services=${providers.mode}.`,
    ),
  );
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
} catch (error) {
  console.error(
    `Backend startup failed (${error.code || "CONFIGURATION_ERROR"}). Check MySQL and backend/.env.`,
  );
  await pool.end();
  process.exitCode = 1;
}
