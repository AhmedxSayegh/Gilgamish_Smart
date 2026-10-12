# API contract

Base path `/api`. Successful responses: `{ "success": true, "data": ... }`. Errors: `{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }`.

Use JSON request bodies. All rows below except health, registration, login and contact require an authenticated session cookie. Every authenticated mutation also requires the `X-CSRF-Token` returned by registration/login/auth-me. Unknown or other users' resource IDs return 404. Invalid requests return 422. All monetary response values are decimal strings.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/health` | Database liveness and provider mode |
| POST | `/auth/register` | name, email, password (10–72 UTF-8 bytes), language |
| POST | `/auth/login` | email, password; creates a new session |
| GET | `/auth/me` | user and CSRF token |
| POST | `/auth/logout` | Revokes session and clears cookie |
| GET/PATCH | `/users/me` | Read profile; patch name/language |
| GET/PATCH | `/users/me/preferences` | Saved default currency, flight, hotel, pace and interests |
| POST | `/contact` | name, email, subject, message; stored acknowledgement |
| GET | `/destinations/search?q=...` | Airport/city lookup; query at least two characters |
| GET | `/flights/search?tripId=...` | Normalized round-trip flight offers |
| GET | `/hotels/search?tripId=...` | Normalized hotel offers |
| GET | `/places/search?tripId=...` | Verified destination place candidates |
| GET | `/places/:id` | Place details in the user's language |
| POST/GET | `/trips` | Create trip / list latest 100 owned trips |
| GET/PATCH/DELETE | `/trips/:id` | Read, modify or delete owned trip and dependent plans |
| POST | `/plans/generate` | `{ "tripId": "UUID" }`; creates version 1 or next version |
| GET/PATCH/DELETE | `/plans/:id` | Read; patch title, isSaved, isSelected:true; delete |
| POST | `/plans/:id/regenerate` | Generate another version from that plan's input |
| PATCH | `/plans/:id/days/:dayNumber` | Replace that day's item list, preserve other days, new version |
| POST | `/plans/:id/days/:dayNumber/regenerate` | Regenerate only one day, new version |
| POST/DELETE | `/plans/:id/favorite` | Add/remove favorite |
| GET | `/favorites` | Latest 100 favorite plans owned by current user |
| GET/PATCH | `/plans/:id/budget` | Read budget; revise allowances/totalBudget in a new version |

## Trip body

Use actual future dates. Currency is one of SAR, USD, EUR, GBP, AED and TRY. Between one and 21 nights and at most nine seated travelers are supported. Dates are destination-local calendar dates, without a timezone conversion. Adults are 12+ for the flight search; supported children are ages 2–11. Infants are not currently supported. In live mode child hotel occupancy is explicitly rejected.

```json
{
  "origin": "Jeddah",
  "destination": "Istanbul",
  "originCode": "JED",
  "destinationCode": "IST",
  "startDate": "2027-01-10",
  "endDate": "2027-01-14",
  "adults": 2,
  "children": 0,
  "totalBudget": "12000.00",
  "currency": "SAR",
  "interests": ["history", "food"],
  "language": "en",
  "preferences": {
    "flightOption": "cheapest",
    "directPreferred": false,
    "hotelStars": 3,
    "pace": "balanced",
    "foodDaily": "80.00",
    "transportDaily": "60.00",
    "otherCosts": "100.00"
  }
}
```

`directPreferred` affects ranking; it is not a promise that only direct inventory exists. Currency is explicit, and mismatched offers are not combined. `foodDaily` is per traveler/day, `transportDaily` is per group/day, and `otherCosts` covers the whole trip.

## Regeneration body

```json
{
  "instruction": "Prioritize historical places and allow more rest time.",
  "pace": "relaxed",
  "interest": "history",
  "cheaper": true
}
```

Fields are optional. `pace` is relaxed, balanced or busy. The structured controls apply deterministically; free-text interpretation is performed by the real AI service. The mock scheduler supports the structured controls and rotates fixture selections, but does not claim to understand arbitrary free text. Full-plan generation and regeneration also accept optional `flightId` and `hotelId` values from the current search results. The backend validates those IDs against fresh candidate data; expired selections return `OFFER_EXPIRED` rather than accepting a client-supplied price. Day regeneration keeps flight/hotel selection unchanged and rejects flightId, hotelId and cheaper:true.

## Day modification

Send the complete replacement item list. An empty list removes all activities for that day. Remove one activity by omitting it; replace a place using a verified ID returned by search; change times by modifying `startTime` and `endTime`.

```json
{
  "dayNumber": 2,
  "date": "2027-01-11",
  "items": [
    {
      "placeId": "mock-place-IST-1",
      "startTime": "10:00",
      "endTime": "11:30",
      "reason": "A morning museum visit."
    }
  ]
}
```

The server checks candidate IDs, duplicate days, dates, times, flight buffers, regular opening hours, duplicate places, overlaps and a minimum transfer allowance. It never accepts place names/prices from this request. Successful edits return a new plan ID and preserve the old version.

## Useful client warning codes

`DEVELOPMENT_FIXTURES`, `PRICES_ARE_SNAPSHOTS`, `PROVIDER_LINKS_OPEN_SEARCH`, `TRANSFER_TIMES_ARE_ESTIMATES`, `OVER_BUDGET`, `ACTIVITY_PRICES_UNKNOWN`, `OPENING_HOURS_UNVERIFIED`, `HOTEL_STAR_RATING_UNAVAILABLE`, `PLACE_DETAILS_UNAVAILABLE`.

Translate these into clear Arabic/English copy in the future UI. When Google place details are temporarily unavailable, the saved day/time and place ID remain available, with `name: null` and `dataStatus: "requires_refresh"`. Do not fabricate missing place details.

The current list endpoints cap results at 100 and do not yet offer cursor pagination. Generation is rate limited and protected against concurrent work for the same trip inside one API process; multi-instance production operation needs a shared job/concurrency mechanism.
