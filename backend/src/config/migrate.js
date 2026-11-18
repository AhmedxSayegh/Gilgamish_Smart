import { readFile } from "node:fs/promises";
import { loadConfig } from "./env.js";
import { createDatabase } from "./database.js";
const db = createDatabase(loadConfig());
try {
  const sql = await readFile(
    new URL("../../../database/schema.sql", import.meta.url),
    "utf8",
  );
  for (const statement of sql
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean))
    await db.query(statement);
  console.log(
    "Gilgamish schema initialized. No external inventory was seeded.",
  );
} finally {
  await db.end();
}
