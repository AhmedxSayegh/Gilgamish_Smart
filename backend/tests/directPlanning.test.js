import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockServices } from './support/travelFixtures.js';
import { tripFixture } from './support/fixture.js';
import { validateItinerary } from '../src/services/itineraryService.js';

test('a closed first place does not empty the day when later candidates are open', async () => {
  const providers = createMockServices();
  const input = tripFixture();
  const [flight] = await providers.travel.flights(input);
  const [hotel] = await providers.travel.hotels(input);
  const base = { latitude: 33.51, longitude: 36.30, provider: 'google', types: ['museum'] };
  const places = [
    { ...base, id: 'closed', openingHours: [] },
    { ...base, id: 'open', openingHours: null },
  ];
  const context = { input, flight, hotel, places, onlyDay: 1 };
  const raw = await providers.ai.generate(context);
  assert.deepEqual(raw.days[0].items.map(i => i.placeId), ['open']);
  assert.equal(validateItinerary(raw, context)[0].items.length, 1);
});
