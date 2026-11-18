// Opt-in live verification: at most two upstream requests; no reservations or raw secrets.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { loadConfig } from "../backend/src/config/env.js";
import { createSerpapiHotelsService } from "../backend/src/services/serpapiHotelsService.js";
import { addDays } from "../backend/src/utils/dates.js";

const config = loadConfig();
assert.equal(
  config.providerModes.hotels,
  "serpapi",
  "Set HOTELS_PROVIDER=serpapi in backend/.env first.",
);
let upstreamCalls = 0;
const service = createSerpapiHotelsService(config, (url, options) => {
  assert.equal(new URL(url).origin, "https://serpapi.com");
  assert.ok(
    ++upstreamCalls <= 2,
    "The smoke check may use at most two requests.",
  );
  return fetch(url, options);
});
const startDate = addDays(new Date().toISOString().slice(0, 10), 30);
const input = {
  destination: "Istanbul",
  destinationCode: "IST",
  startDate,
  endDate: addDays(startDate, 4),
  adults: 2,
  children: 0,
  currency: "SAR",
  language: "en",
};
try {
  const offers = await service.hotels(input);
  assert.ok(offers.length, "The live search returned no priced hotels.");
  assert.ok(
    offers.every(
      (offer) =>
        offer.provider === "serpapi" &&
        offer.currency === input.currency &&
        offer.priceScope === "one_room_full_stay",
    ),
  );
  const chosen = offers[0];
  const token = chosen.propertyToken || chosen.providerHotelId;
  const details = await service.details(token, input);
  const prices = await service.prices(token, input);
  const booking = await service.bookingLinks(token, input);
  assert.ok(details.hotel.name);
  assert.ok(
    booking.links.every(
      (link) =>
        link.url.startsWith("https://") &&
        !link.url.includes(config.serpapiKey),
    ),
  );
  assert.equal(
    upstreamCalls,
    2,
    "Details, prices and booking links should share the same cached fetch.",
  );
  assert.ok(
    !JSON.stringify([offers, details, prices, booking]).includes(
      config.serpapiKey,
    ),
  );
  const report = {
    verifiedAt: new Date().toISOString(),
    result: "passed",
    provider: "serpapi",
    engine: "google_hotels",
    input,
    hotelCount: offers.length,
    sellerPriceCount: prices.prices.length,
    externalLinkCount: booking.links.length,
    upstreamCalls,
    keySource: "backend/.env only",
    bookingPerformed: false,
  };
  await writeFile(
    new URL("../docs/verification/serpapi-hotels-live.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} catch (error) {
  console.error(
    JSON.stringify({
      result: "failed",
      code: error.code || "VERIFICATION_FAILED",
      upstreamCalls,
    }),
  );
  process.exitCode = 1;
}
