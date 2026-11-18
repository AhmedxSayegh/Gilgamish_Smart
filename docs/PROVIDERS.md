# External provider setup and limits

## Independent service selection

Each setting overrides USE_MOCK_SERVICES for that service only. Destinations default to the fixed `demo` catalog, planning to `rules`, and routes to `mock`. The legacy flag supplies other service defaults. Credentials are required only for enabled live providers. Failed live requests return errors; they never silently substitute mock results.

| Setting | Values | Required credentials for live selection |
| --- | --- | --- |
| DESTINATIONS_PROVIDER | demo / mock / amadeus | None for demo; AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET for amadeus |
| FLIGHTS_PROVIDER | mock / amadeus | AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET |
| HOTELS_PROVIDER | mock / amadeus / serpapi | Amadeus credentials, or SERPAPI_API_KEY from backend/.env only |
| PLACES_PROVIDER | mock / google | GOOGLE_PLACES_API_KEY |
| ROUTES_PROVIDER | mock / google | GOOGLE_ROUTES_API_KEY (or GOOGLE_PLACES_API_KEY with Routes access) |
| AI_PROVIDER | rules / mock | None; local selection and scheduling algorithms |

The local setup now selects HOTELS_PROVIDER=serpapi alongside the existing flight selection. See [SerpApi hotels](SERPAPI-HOTELS.md) for APIs, limits and verification. Restart the backend after configuration changes. Health reports each service's provider and overall mode (mock, mixed, live), calculated from flight/hotel/place/route data. Mixed plans retain development-data warnings; flight, hotel and place search results report their individual mode. Live Places content remains request-scoped.


All protected provider calls run on the backend. Never put credentials in `VITE_*` variables or frontend source.

## Development mode

With no explicit provider overrides, `USE_MOCK_SERVICES=true` selects fixture flights/hotels/places, mock routes, the fixed demo city catalog and the real local rules planner. No third-party credentials are required in that configuration, but the application server still requires MySQL. Unit/API tests use a test-only in-memory repository. There is no in-memory production persistence fallback.

Fixtures use unmistakable development names, synthetic prices and mock provider IDs. The shared ten-city catalog contains DAM, IST, MED, QCA, JED, RUH, AMM, DXB, CAI and PAR; `mock` destination lookup remains a compatibility alias for that catalog. QCA is a demo city identifier for Makkah, never sent as a flight airport. See [demo cities](DEMO-CITIES.md). Plans using fixture travel data retain a `DEVELOPMENT_FIXTURES` warning.

## Amadeus

1. Create a developer application at https://developers.amadeus.com/.
2. Set `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` in `backend/.env`.
3. Begin with `AMADEUS_ENV=test`; enable production only when the account has the appropriate access.

The adapter uses OAuth client credentials, caches tokens with an expiry margin, retries an expired token once, and uses these endpoints:

- `POST /v1/security/oauth2/token`
- `GET /v1/reference-data/locations`
- `GET /v2/shopping/flight-offers`
- `GET /v1/reference-data/locations/hotels/by-city`
- `GET /v1/reference-data/locations/hotels/by-geocode` (Makkah)
- `GET /v3/shopping/hotel-offers`

City metadata caches for one hour; flight/hotel search responses for 30 seconds. Saved quotes have an `observedAt` timestamp and remain historical snapshots. Test-environment inventory is not a guarantee of live availability. Responses in currencies other than the requested currency cannot be silently combined.

Hotel limitations: the current real adapter requests one room for the complete stay and only supports adult occupancy. Child hotel searches return `HOTEL_CHILD_OCCUPANCY_UNSUPPORTED`. It does not invent stars or ratings that are absent from the response. Additional rooms and child ages require an occupancy-aware extension and provider validation.

Booking limitation: these search responses are not treated as guaranteed payable deep links. The application creates a Google Flights search URL and a Booking.com hotel search URL, marked `bookingLinkType: "provider_search"`. The search can return different inventory and prices. These are general search links, not an Amadeus booking or reservation. The UI must say “Search with provider,” not “Booking confirmed.” No card data, ticketing or checkout is implemented.

Official references:

- https://github.com/amadeus4dev/amadeus-node
- https://amadeus4dev.github.io/amadeus-node/
- https://github.com/amadeus4dev/amadeus-open-api-specification

## Google Places

1. Create a Google Cloud project, enable billing and Places API (New).
2. Create a server key restricted to Places API and to the deployment's supported server restrictions.
3. Set `GOOGLE_PLACES_API_KEY`.

Text Search is `POST https://places.googleapis.com/v1/places:searchText`. Place Details is `GET https://places.googleapis.com/v1/places/{id}`. Both send explicit field masks. Requested categories reflect the user's interests. Photos are not requested or stored. Entrance fees are unknown unless provided by an independent, legitimate source; this adapter always leaves them null.

Only place IDs are retained as provider identifiers in itinerary records. Current names, ratings, coordinates and hours are hydrated when the plan is loaded. The eventual frontend must display required Google Maps attribution, any returned third-party attributions, and provide the applicable public terms/privacy pages before production use.

Official references:

- https://developers.google.com/maps/documentation/places/web-service/text-search
- https://developers.google.com/maps/documentation/places/web-service/place-details
- https://developers.google.com/maps/documentation/places/web-service/policies

## Rule-based planning (current)

Set `AI_PROVIDER=rules` (the default). The engine selects and schedules supplied candidates using interests, proximity, diversity, known costs and opening windows. It calls no language-model service and needs no model credentials or local runtime. `mock` is a separate test fixture generator. External and Ollama planning adapters have been removed.

The bounded agent validates supplied IDs/times, evaluates coverage and cost, can perform one extra targeted place search, and tries at most three drafts. Reasons are Arabic/English templates based on supplied fields. Unknown fees stay unknown; visit durations are explicit estimates. Use structured controls for modifications, not free-text instructions.

Implementation details and verification: [RULE-BASED-PLANNING](RULE-BASED-PLANNING.md).

## Activating real providers

Set all required credentials, set `USE_MOCK_SERVICES=false`, and restart the backend. Missing credentials cause startup to fail clearly. Provider failures never fall back to synthetic data. Live calls have not been verified with an actual user's credentials in this checkpoint.

