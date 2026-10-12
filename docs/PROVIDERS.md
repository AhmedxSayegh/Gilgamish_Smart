# External provider setup and limits

All protected provider calls run on the backend. Never put credentials in `VITE_*` variables or frontend source.

## Development mode

`USE_MOCK_SERVICES=true` selects only `backend/src/providers/mockServices.js`. No third-party credentials are required, but the application server still requires MySQL. Unit/API tests use a test-only in-memory repository. There is no in-memory production persistence fallback.

Fixtures use unmistakable development names, synthetic prices and mock provider IDs. Supported development city codes: JED, RUH, IST, PAR, DXB, LON and AMM. The generated plan includes `mode: "mock"` and a `DEVELOPMENT_FIXTURES` warning. These values must be displayed in the eventual UI.

## Amadeus

1. Create a developer application at https://developers.amadeus.com/.
2. Set `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` in `backend/.env`.
3. Begin with `AMADEUS_ENV=test`; enable production only when the account has the appropriate access.

The adapter uses OAuth client credentials, caches tokens with an expiry margin, retries an expired token once, and uses these endpoints:

- `POST /v1/security/oauth2/token`
- `GET /v1/reference-data/locations`
- `GET /v2/shopping/flight-offers`
- `GET /v1/reference-data/locations/hotels/by-city`
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

## External AI

The implemented adapter uses the OpenAI-compatible Chat Completions JSON schema interface. Default endpoint: `https://api.openai.com/v1`; configurable using `AI_BASE_URL`. Supply `AI_API_KEY` and an available schema-capable `AI_MODEL`. The configured model must support strict JSON-schema output. An alternate compatible service may require adapter changes if its contract differs.

The request supplies the selected real flight/hotel, ranked candidate places, dates, daily time windows, interests, allowances, language and requested modifications. Model output only contains selected IDs and scheduled item IDs/times/reasons. Backend validation runs even after schema-constrained generation. No provider facts or monetary totals are taken from model output. Truncated responses, refusals and invalid JSON fail explicitly, preserving the trip for retry.

Official reference: https://developers.openai.com/api/docs/guides/structured-outputs

## Activating real providers

Set all required credentials, set `USE_MOCK_SERVICES=false`, and restart the backend. Missing credentials cause startup to fail clearly. Provider failures never fall back to synthetic data. Live calls have not been verified with an actual user's credentials in this checkpoint.
