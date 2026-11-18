import test from 'node:test';
import assert from 'node:assert/strict';
import { createGooglePlacesService } from '../src/services/googlePlacesService.js';

test('Damascus search excludes namesakes abroad, distant places and missing coordinates', async () => {
  const service = createGooglePlacesService({}, async (_, options) => {
    const body = JSON.parse(options.body);
    assert.match(body.textQuery, /in Damascus, Syria$/);
    assert.ok(body.locationRestriction.rectangle);
    return new Response(JSON.stringify({ places: [
      { id: 'palace', displayName: { text: 'قصر العظم' }, location: { latitude: 33.5102, longitude: 36.3068 } },
      { id: 'jeddah', displayName: { text: 'مشويات ومعجنات دمشق' }, location: { latitude: 21.6126, longitude: 39.1719 } },
      { id: 'distant', location: { latitude: 33.8, longitude: 36.3 } },
      { id: 'unknown' },
      { id: 'closed', businessStatus: 'CLOSED_PERMANENTLY', location: { latitude: 33.51, longitude: 36.30 } },
    ] }));
  });
  for (const destination of ['Damascus', 'دمشق']) {
    const places = await service.search({ destination, destinationCode: 'DAM', language: 'ar', interests: [] });
    assert.deepEqual(places.map(p => p.id), ['palace']);
  }
});

test('Damascus returns no candidates rather than substituting out-of-area results', async () => {
  const service = createGooglePlacesService({}, async () => new Response(JSON.stringify({ places: [
    { id: 'wrong', location: { latitude: 21.61, longitude: 39.17 } },
  ] })));
  assert.deepEqual(await service.search({ destination: 'Damascus', destinationCode: 'DAM', language: 'en', interests: [] }), []);
});
