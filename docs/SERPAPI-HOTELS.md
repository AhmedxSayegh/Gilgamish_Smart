# SerpApi Google Hotels — 29 October 2026

The existing Express travel-provider interface now supports `HOTELS_PROVIDER=serpapi`. Recommendations and plan generation use its observed hotel offers. React hotel cards and saved-plan booking summaries expose **Book now / احجز الآن**, opening hotel details, seller prices and external booking links. The user chooses an external seller; the app does not create reservations or payments.

## Configuration and key protection

Put `SERPAPI_API_KEY` only in `backend/.env` and set `HOTELS_PROVIDER=serpapi` there. This key is read from dotenv's parsed contents at the absolute backend file path; inherited environment values, root `.env`, `VITE_*` variables and browser inputs cannot override it. Missing keys fail startup when the provider is selected. The local provider setting was changed from mock to serpapi; the key itself was neither copied nor changed. Restart an already running backend to load the new selection. No deployment or automatic restart of existing application processes was performed.

All calls go to the fixed `https://serpapi.com/search.json` endpoint with `engine=google_hotels`, dates, currency, language and adults. Demo-city/country names disambiguate destinations, including Makkah separately from Jeddah. Only normalized allowlisted fields are returned. Raw provider errors, metadata and SerpApi URLs are discarded. External links require HTTPS and exclude credentials, API hosts, local/IP addresses, unsafe nested redirects and embedded API keys. The backend never fetches returned seller URLs.

## APIs and data

Authenticated endpoints (base `/api`):

| Route                                         | Result                                                      |
| --------------------------------------------- | ----------------------------------------------------------- |
| `GET /hotels/search?tripId=UUID`              | Observed hotels usable by the planner                       |
| `GET /hotels/TOKEN?tripId=UUID`               | Hotel details and prices                                    |
| `GET /hotels/TOKEN/prices?tripId=UUID`        | Seller prices and observation time                          |
| `GET /hotels/TOKEN/booking-links?tripId=UUID` | Safe seller links, optional hotel website and hotel details |

Each endpoint accepts exactly one owned `tripId` or `planId`. Saved versions use `plan.input`, preserving the original dates and occupancy after subsequent trip edits. Use the returned `propertyToken` for `TOKEN`. Stable offer IDs include property, stay, adult occupancy and currency. Long property tokens remain in the JSON snapshot while a hash fits the existing SQL provider ID column; no database migration is needed.

Search includes only hotels with a positive observed full-stay total. After-tax totals take priority; otherwise tax status stays unknown or explicitly excluded. No total is invented from a nightly price. Seller totals and nightly amounts are separate nullable decimal strings in the requested currency. The UI labels website links separately from seller offers and displays tax status and final-price confirmation. Missing stars/ratings remain unknown. An empty search is an empty list; provider failures never become mock inventory.

The existing trip contract supports one room and does not collect child ages. SerpApi requires ages for child pricing; children produce `HOTEL_CHILD_OCCUPANCY_UNSUPPORTED` before any provider request. Additional rooms and age-aware pricing require a separate occupancy extension. Snapshot prices do not guarantee room availability or final checkout terms.

## Consumption and errors

| Control                                   | Default                               | Allowed configuration |
| ----------------------------------------- | ------------------------------------- | --------------------- |
| `SERPAPI_DAILY_LIMIT`                     | 100 upstream attempts / UTC day       | 1–1000                |
| `SERPAPI_MINUTE_LIMIT`                    | 20 upstream attempts / rolling minute | 1–60                  |
| `SERPAPI_CONCURRENCY`                     | 2 simultaneous calls                  | 1–4                   |
| Authenticated hotel/recommendation routes | 30 requests / user / 15 minutes       | Fixed                 |
| Cached results                            | 5 minutes, maximum 150 entries        | Fixed                 |
| Upstream timeout                          | 20 seconds                            | Fixed                 |

Limits apply to search, details and planning through the same adapter instance. Identical in-flight requests share a call. Details, prices and booking links share the same cached detail request. Failed upstream attempts count; cache hits do not. No automatic retries or forced SerpApi cache bypass are used. An upstream 429 creates a 60-second cooldown. All application counters are **per process and in memory**: restarts reset them and multiple server processes have separate limits. The SerpApi account quota remains independent; use an external shared store if running multiple processes later.

Invalid dates, occupancy, currency, tokens and unknown query fields are rejected. Ownership is verified before provider access. API errors distinguish unavailable configuration, rejected credentials, provider outage, malformed responses, timeout, per-user limit and provider allowance exhaustion. Retry timing is exposed without exposing upstream messages or keys. Arabic translations are included.

## Verification

- `node --test backend/tests/serpapiHotels.test.js`: adapter, API, input/ownership, selected-offer generation, saved-version dates, URL/key protection, caching and consumption tests.
- With `TEST_DB_NAME` set to a dedicated `gilgamish_test_*` database, `node --test backend/tests/serpapiHotels.mysql.integration.js` verifies real SQL persistence of hotel snapshots and long tokens, plus original saved-plan booking dates. Provider responses are controlled and no live credits are used.
- `node scripts/check-serpapi-hotels.mjs`: opt-in live smoke check using at most two upstream calls, no booking. Evidence: [serpapi-hotels-live.json](verification/serpapi-hotels-live.json).
- `tests/e2e/hotel-booking.spec.js`: real React planner and saved-plan pages with controlled API responses, including loading, errors, retry, empty links, English/Arabic, mobile and external-link behavior.
- Existing IGNAV service, booking component and tests were not edited; file hashes are compared with the initial inspection.

Full results and changed-file list: [implementation report](SERPAPI-IMPLEMENTATION-REPORT.md).

Official response/parameter references: [Google Hotels API](https://serpapi.com/google-hotels-api), [properties](https://serpapi.com/google-hotels-properties), [property details](https://serpapi.com/google-hotels-property-details).
