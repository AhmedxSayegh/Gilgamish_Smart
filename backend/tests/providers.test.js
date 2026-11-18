import test from "node:test";
import assert from "node:assert/strict";
import { createGooglePlacesService } from "../src/services/googlePlacesService.js";
import { tripFixture } from "./support/fixture.js";
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("Google Places requests explicit fields and leaves missing fees unknown", async () => {
  const api = createGooglePlacesService(
    { googleKey: "secret" },
    async (url, options) => {
      assert.ok(options.headers["X-Goog-FieldMask"].includes("places.id"));
      assert.ok(!options.headers["X-Goog-FieldMask"].includes("*"));
      assert.equal(JSON.parse(options.body).languageCode, "en");
      return response({
        places: [
          {
            id: "place-1",
            displayName: { text: "Museum" },
            types: ["museum"],
            rating: 4.6,
            location: { latitude: 41, longitude: 29 },
          },
        ],
      });
    },
  );
  const [place] = await api.search(tripFixture());
  assert.equal(place.name, "Museum");
  assert.equal(place.estimatedCost, null);
  assert.equal(place.openingHours, null);
  assert.equal(place.provider, "google");
});
