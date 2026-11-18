// Explicit opt-in: rule-based planning + real Google Places + dedicated SQL test database.
// Travel quotes are labeled fixtures; routes are live only with --routes. No booking/order/payment is made.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import request from "supertest";
import assert from "node:assert/strict";
import { loadConfig } from "../backend/src/config/env.js";
import { createMockServices } from "../backend/tests/support/travelFixtures.js";
import { createMockRoutesService } from "../backend/tests/support/routeFixture.js";
import { createProviders } from "../backend/src/providers/index.js";
import { createApp } from "../backend/src/app.js";
import { MysqlRepository } from "../backend/src/repositories/mysqlRepository.js";
import { tripFixture } from "../backend/tests/support/fixture.js";
import { addDays } from "../backend/src/utils/dates.js";

const config = loadConfig({ ...process.env, DB_NAME: "gilgamish_test_agent", AI_PROVIDER: "rules" });
if (config.db.database !== "gilgamish_test_agent") throw new Error("This check requires its dedicated test database.");
const originalFetch = globalThis.fetch, outboundHosts = {};
globalThis.fetch = async (url, options) => {
  const host = new URL(String(url)).hostname;
  if (!["places.googleapis.com", "routes.googleapis.com"].includes(host)) throw new Error(`Unexpected HTTP host in rules-only acceptance check: ${host}`);
  outboundHosts[host] = (outboundHosts[host] || 0) + 1;
  return originalFetch(url, options);
};
const pool = mysql.createPool({ ...config.db, dateStrings: true, timezone: "Z" });
let userId;
try {
  const schema = await readFile(new URL("../database/schema.sql", import.meta.url), "utf8");
  for (const statement of schema.split(";").map((s) => s.trim()).filter(Boolean)) await pool.query(statement);
  const repository = new MysqlRepository(pool), providers = createProviders(config);
  const fixtures = createMockServices();
  providers.travel = fixtures.travel;
  providers.modes = { ...providers.modes, flights: "mock", hotels: "mock" };
  providers.mode = "mixed";
  if (!process.argv.includes("--routes")) {
    providers.routes = createMockRoutesService();
    providers.modes.routes = "mock";
  }
  const app = createApp({ repository, providers, config });
  const client = request.agent(app);
  const reg = await client.post("/api/auth/register").send({ name: "Agent Acceptance Test", email: `agent-${randomUUID()}@example.com`, password: randomUUID() + "a9!", language: "ar" });
  assert.equal(reg.status, 201);
  userId = reg.body.data.user.id;
  const csrf = reg.body.data.csrfToken;
  const base = tripFixture({ language: "ar", interests: ["history"] });
  const trip = await client.post("/api/trips").set("X-CSRF-Token", csrf).send({ ...base, endDate: addDays(base.startDate, 1) });
  assert.equal(trip.status, 201);
  const started = Date.now();
  const generated = await client.post("/api/plans/generate").set("X-CSRF-Token", csrf).send({ tripId: trip.body.data.id });
  if (generated.status !== 201) throw new Error(`Generation failed: ${generated.body.error?.code || generated.status}`);
  const plan = generated.body.data;
  assert.equal(plan.days.length, 2);
  assert.equal(plan.agent.plannerProvider, "rules");
  assert.ok(plan.days.some((d) => d.items.length));
  assert.ok(plan.days.flatMap((d) => d.items).every((i) => i.place.provider === "google"));
  if (process.argv.includes("--routes") && plan.days.some((d) => d.items.length > 1)) assert.ok(plan.agent.checks.routeCheckedDays > 0);
  const reloaded = await new MysqlRepository(pool).getPlan(userId, plan.id);
  assert.deepEqual(reloaded.agent, plan.agent);
  assert.equal(reloaded.budget.totalCost, plan.budget.totalCost);
  const summary = { checkedAt: new Date().toISOString(), durationSeconds: (Date.now() - started) / 1000,
    database: "dedicated test database; test user removed after check", chatbot: "deferred",
    services: providers.modes, dayCount: plan.days.length, activityCount: plan.days.reduce((sum, d) => sum + d.items.length, 0),
    plannerEngine: "rules", languageModelCalls: 0, outboundHosts,
    reportPersisted: true, source: `real Google Places requests; local planning algorithms; flight/hotel fixtures; ${config.providerModes.routes === "google" ? "real Google Routes" : "route fixtures"}`,
    report: plan.agent, warnings: plan.warnings };
  await mkdir(new URL("../docs/verification/", import.meta.url), { recursive: true });
  await writeFile(new URL("../docs/verification/rules-live-journey.json", import.meta.url), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} catch (error) { console.error(`Journey acceptance check failed: ${error.message}`); process.exitCode = 1; }
finally { globalThis.fetch = originalFetch; if (userId) await pool.execute("DELETE FROM users WHERE id=?", [userId]); await pool.end(); }
