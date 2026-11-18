import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { testConfig as loadConfig } from "./support/config.js";
import { createMockServices } from "./support/travelFixtures.js";
import { MemoryRepository } from "./support/memoryRepository.js";
import { tripFixture } from "./support/fixture.js";

function appFor(clientOrigin = "http://127.0.0.1:5173", production = false) {
  return createApp({
    config: { ...loadConfig({  }), clientOrigin, production },
    providers: createMockServices(),
    repository: new MemoryRepository(),
  });
}

test("local development accepts localhost and 127.0.0.1 with credentialed CORS on the configured port", async () => {
  for (const configured of ["http://127.0.0.1:5173", "http://localhost:5173"]) {
    const app = appFor(configured);
    for (const origin of ["http://127.0.0.1:5173", "http://localhost:5173"]) {
      const response = await request(app).get("/api/health").set("Origin", origin).expect(200);
      assert.equal(response.headers["access-control-allow-origin"], origin);
      assert.equal(response.headers["access-control-allow-credentials"], "true");
      assert.match(response.headers.vary, /Origin/);
    }
  }
});

test("local origin aliases reject other ports, protocols, deceptive hosts and null origins", async () => {
  const app = appFor();
  for (const origin of ["http://localhost:5180", "http://127.0.0.1:4000", "https://localhost:5173", "https://attacker.example", "http://localhost.attacker.example:5173", "http://127.0.0.1.attacker.example:5173", "null"]) {
    const response = await request(app).get("/api/health").set("Origin", origin).expect(403);
    assert.equal(response.body.error.code, "ORIGIN_DENIED");
    assert.equal(response.headers["access-control-allow-origin"], undefined);
  }
});

test("localhost preflight and login work while authentication and CSRF remain required", async () => {
  const app = appFor(), origin = "http://localhost:5173";
  const preflight = await request(app).options("/api/trips").set("Origin", origin)
    .set("Access-Control-Request-Method", "POST").set("Access-Control-Request-Headers", "content-type,x-csrf-token").expect(204);
  assert.equal(preflight.headers["access-control-allow-origin"], origin);
  assert.match(preflight.headers["access-control-allow-headers"], /x-csrf-token/);
  await request(app).get("/api/trips").set("Origin", origin).expect(401);
  const agent = request.agent(app);
  const registered = await agent.post("/api/auth/register").set("Origin", origin).send({ name: "Local origin test", email: "local-origin@example.invalid", password: "local-origin-test-password" }).expect(201);
  const denied = await agent.post("/api/trips").set("Origin", origin).send(tripFixture()).expect(403);
  assert.equal(denied.body.error.code, "CSRF_INVALID");
  await agent.post("/api/trips").set("Origin", origin).set("X-CSRF-Token", registered.body.data.csrfToken).send(tripFixture()).expect(201);
});

test("production and remote development sites accept only the exact configured origin", async () => {
  for (const [configured, production, denied] of [
    ["https://localhost:5173", true, "https://127.0.0.1:5173"],
    ["https://app.example", true, "http://localhost:5173"],
    ["https://app.example", false, "https://other.example"],
  ]) {
    const app = appFor(configured, production);
    const allowed = await request(app).get("/api/health").set("Origin", configured).expect(200);
    assert.equal(allowed.headers["access-control-allow-origin"], configured);
    const response = await request(app).get("/api/health").set("Origin", denied).expect(403);
    assert.equal(response.body.error.code, "ORIGIN_DENIED");
  }
});
