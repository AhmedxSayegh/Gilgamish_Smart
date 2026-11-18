# Flight and hotel adapters — pending provider selection

The user has not chosen vendors. Application code uses independent `travel.flights(input)` and `travel.hotels(input)` interfaces. Keep external API formats inside adapters, and never put credentials in frontend variables or responses.

## Existing provisional implementation

Amadeus OAuth, location search, round-trip flight search and adult-only single-room hotel search are implemented and covered by controlled-response tests. This is not a claim that live account credentials or regional inventory have been verified.

In `backend/.env`, after choosing Amadeus and obtaining credentials:

```env
AMADEUS_ENV=test
AMADEUS_CLIENT_ID=your-client-id
AMADEUS_CLIENT_SECRET=your-client-secret
FLIGHTS_PROVIDER=amadeus
HOTELS_PROVIDER=amadeus
# Independent: the ten-city demo catalog needs no live city lookup.
DESTINATIONS_PROVIDER=demo
```

The existing local configuration intentionally keeps flights/hotels mock until credentials are present. Set either provider independently and restart. `npm run providers:check` reports missing variable names without showing values. The `test` endpoint returns sandbox inventory; production access requires an appropriate account and explicit configuration.

If a different vendor is selected, implement its adapter and provider option first. A random vendor's API key cannot be substituted for Amadeus credentials.

## Required normalized flight fields

- `id`, `provider`, `providerOfferId`: opaque provider-specific identity, not model-created values.
- `departureTime`, `arrivalTime`, `returnDepartureTime`, `returnArrivalTime`: destination/origin-local ISO datetimes for round-trip windows.
- `origin`, `destination`, `airlineName`, `airlineCode`, `stops`, `returnStops`, `durationMinutes`.
- `price`: nonnegative two-decimal string for the entire party and round trip; `currency`: original verified ISO currency; `priceScope` documents the quote scope.
- `observedAt`, `expiresAt` when provided, `bookingUrl`, `bookingLinkType`. Search links are not reservations or offer guarantees.

## Required normalized hotel fields

- `id`, `provider`, `providerHotelId`, optional `providerOfferId`, `name`.
- `price`, `currency`, `rooms`, `adults`, `priceScope`, `checkIn`, `checkOut`.
- `latitude`/`longitude`, `stars`, `rating` may be null if unknown; never manufacture metadata.
- `observedAt`, `expiresAt` when available, `bookingUrl`, `bookingLinkType`, supplier conditions when provided.

The current Amadeus adapter verifies only adults and one room; searches with children are explicitly rejected. Supporting child ages/multiple rooms requires a form/schema and adapter update, not assumed occupancy. Currency mismatches are not silently relabeled. The currently unused exchange helper must be wired/tested separately for any future provider that quotes a different currency.

## Acceptance before marking a provider live

1. Provider authentication and permission checks succeed.
2. Same dates, passenger/room counts and currency are verified in returned offers.
3. Rate-limit, empty inventory, expired offer and provider outage behavior are tested.
4. Traveler selections survive plan generation; refreshed inventory rejects stale IDs.
5. Prices/unknown fields and sandbox status are honestly displayed.
6. Tests create no order, reservation, or payment.
