// Explicit opt-in integration test. Creates and removes only its own test users.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import request from "supertest";
import { MysqlRepository } from "../src/repositories/mysqlRepository.js";
import { createApp } from "../src/app.js";
import { createMockServices } from "./support/travelFixtures.js";
import { createRuleBasedPlanner } from "../src/services/ruleBasedPlanner.js";
import { loadConfig } from "../src/config/env.js";
import { tripFixture } from "./support/fixture.js";
test("MySQL schema, authentication, persistence, version transactions, ownership and cascade deletion", async () => {
  const name = process.env.TEST_DB_NAME;
  assert.ok(
    /^gilgamish_test(?:_[a-z0-9]+)?$/.test(name || ""),
    "TEST_DB_NAME must name a dedicated gilgamish_test database.",
  );
  const config = loadConfig({
    ...process.env,
    DB_NAME: name,
    USE_MOCK_SERVICES: "true",
  });
  const pool = mysql.createPool({
    ...config.db,
    dateStrings: true,
    timezone: "Z",
    connectionLimit: 8,
    multipleStatements: false,
  });
  const repo = new MysqlRepository(pool),
    ids = [];
  try {
    const sql = await readFile(
      new URL("../../database/schema.sql", import.meta.url),
      "utf8",
    );
    for (const statement of sql
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean))
      await pool.query(statement);
    const providers = { ...createMockServices(), plannerMode: "rules", aiMode: "rules", ai: createRuleBasedPlanner() };
    const app = createApp({
        repository: repo,
        providers,
        config,
      }),
      agent = request.agent(app);
    const result = await agent
      .post("/api/auth/register")
      .send({
        name: "SQL Test Traveler",
        email: `sql-${randomUUID()}@example.com`,
        password: "mysql-integration-password",
        language: "ar",
      })
      .expect(201);
    const { user, csrfToken } = result.body.data;
    ids.push(user.id);
    const mutation = (method, url, body = {}) =>
      agent[method](url).set("X-CSRF-Token", csrfToken).send(body);
    const trip = (
      await mutation(
        "post",
        "/api/trips",
        tripFixture({ language: "ar" }),
      ).expect(201)
    ).body.data;
    const plan = (
      await mutation("post", "/api/plans/generate", { tripId: trip.id }).expect(
        201,
      )
    ).body.data;
    assert.equal(plan.days.length, 5);
    assert.equal(plan.mode, "mock");
    assert.equal(plan.agent.mode, "bounded");
    assert.equal(plan.agent.plannerProvider, "rules");
    const reloaded = await new MysqlRepository(pool).getPlan(user.id, plan.id);
    assert.deepEqual(reloaded.days, plan.days);
    assert.deepEqual(reloaded.agent, plan.agent);
    assert.equal(reloaded.budget.totalCost, plan.budget.totalCost);
    assert.equal(typeof reloaded.budget.totalCost, "string");
    await assert.rejects(() => repo.getPlan(randomUUID(), plan.id), {
      status: 404,
    });
    await mutation("post", `/api/plans/${plan.id}/favorite`).expect(200);
    assert.equal((await repo.listFavorites(user.id)).length, 1);
    const changed = (
      await mutation("post", `/api/plans/${plan.id}/days/2/regenerate`, {
        pace: "relaxed",
      }).expect(201)
    ).body.data;
    assert.equal(changed.version, 2);
    assert.equal(changed.agent, null);
    assert.deepEqual(changed.days[0], plan.days[0]);
    assert.equal((await repo.getPlan(user.id, plan.id)).isSelected, false);
    const concurrent = await Promise.all([
      repo.createPlan(user.id, trip.id, changed),
      repo.createPlan(user.id, trip.id, changed),
    ]);
    assert.deepEqual(concurrent.map((p) => p.version).sort(), [3, 4]);
    const [selected] = await pool.execute(
      "SELECT COUNT(*) AS count FROM travel_plans WHERE trip_id=? AND is_selected=TRUE",
      [trip.id],
    );
    assert.equal(selected[0].count, 1);
    const latest = concurrent.find((p) => p.version === 4);
    await repo.deletePlan(user.id, latest.id);
    assert.equal(
      (await repo.getTrip(user.id, trip.id)).plans.filter((p) => p.isSelected)
        .length,
      1,
    );
    await mutation("patch", "/api/users/me/preferences", {
      hotelStars: 4,
      flightOption: "shortest",
      pace: "relaxed",
      currency: "SAR",
      interests: ["history", "history"],
    }).expect(200);
    assert.deepEqual((await repo.getPreferences(user.id)).interests, [
      "history",
    ]);
    await mutation("delete", `/api/trips/${trip.id}`).expect(200);
    await assert.rejects(() => repo.getPlan(user.id, plan.id), { status: 404 });
    const [orphans] = await pool.execute(
      "SELECT COUNT(*) AS count FROM favorites WHERE user_id=?",
      [user.id],
    );
    assert.equal(orphans[0].count, 0);
    await mutation("post", "/api/auth/logout").expect(200);
    await agent.get("/api/auth/me").expect(401);
  } finally {
    for (const id of ids)
      await pool.execute("DELETE FROM users WHERE id=?", [id]);
    await pool.end();
  }
});
