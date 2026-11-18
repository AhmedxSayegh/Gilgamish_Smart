import test from 'node:test';
import assert from 'node:assert/strict';
import { testConfig as loadConfig } from "./support/config.js";
import { createProviders } from '../src/providers/index.js';

test('live provider configuration selects Qwen and rejects retired modes', () => {
  const providers = createProviders(loadConfig());
  assert.deepEqual(providers.modes, { destinations: 'demo', flights: 'ignav', hotels: 'serpapi', places: 'google', routes: 'google', ai: 'qwen' });
  assert.equal(providers.plannerMode, 'qwen');
  for (const mode of ['mock','amadeus']) assert.throws(() => loadConfig({ FLIGHTS_PROVIDER: mode }), /FLIGHTS_PROVIDER/);
});
