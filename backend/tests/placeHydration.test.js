import test from 'node:test';
import assert from 'node:assert/strict';
import { createTripPlannerService } from '../src/services/tripPlannerService.js';
import { AppError } from '../src/utils/errors.js';

test('quota exhaustion preserves saved activities, warns clearly and stops further detail batches', async () => {
  const plan = { input: { language: 'ar' }, warnings: [], days: [{ items: Array.from({ length: 12 }, (_, i) => ({ placeId: `id-${i}`, place: { id: `id-${i}`, provider: 'google', name: null } })) }] };
  let calls = 0;
  const planner = createTripPlannerService({ getPlan: async () => structuredClone(plan) }, { places: { details: async () => {
    calls++;
    throw new AppError(503, 'GOOGLE_PLACES_UNAVAILABLE', 'Quota exceeded', { upstreamStatus: 429 });
  } } });
  const result = await planner.hydrate('user', 'plan');
  assert.equal(calls, 5);
  assert.equal(result.days[0].items.length, 12);
  assert.ok(result.warnings.includes('PLACE_DETAILS_QUOTA_EXCEEDED'));
  assert.ok(result.warnings.includes('PLACE_DETAILS_UNAVAILABLE'));
});
