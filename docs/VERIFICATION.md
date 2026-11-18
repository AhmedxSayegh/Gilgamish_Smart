# Verification — 6 October 2026

## Results

| Check                            | Result                  | Evidence / coverage                                                                                                                                                                                  |
| -------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend default suite            | **18 passed, 0 failed** | Auth, CSRF, ownership, API journey, plan versions/favorites, money math, validation and controlled provider contracts                                                                                |
| Actual MySQL integration         | **1 passed, 0 failed**  | MySQL 8.4.7; schema, Arabic data, sessions, trips/plans/budgets/favorites, unique concurrent version allocation and cascades                                                                         |
| Frontend production build        | **Passed**              | Vite 7.3.7, 57 modules; approximately 340KB JS / 107KB gzip                                                                                                                                          |
| Public-page browser acceptance   | **Passed**              | All five public routes, original assets, real contact submission, mobile Arabic and persistent RTL                                                                                                   |
| Authenticated browser acceptance | **Passed**              | Registration, protected redirect, searches/offer selection, generation, save/favorite, immutable edits, budget, full/day regeneration, version list, persistence, profile, mobile sign-out and login |
| Built-app server                 | **Passed**              | Both browser flows executed through `scripts/serve.mjs` serving frontend build + API on one origin; direct routes and reloads work                                                                   |
| PDF output                       | **Passed**              | Chromium generated a real PDF; header/actions hidden by print styles; itinerary and estimate/source content retained                                                                                 |
| Original backend preservation    | **Passed**              | SHA-256 comparison against the recovered checkpoint: zero changed backend files                                                                                                                      |

Browser verification used Node 24.19.0, Playwright 1.63.0, Chromium 133 and real MySQL. External services were in mock mode. The unchanged backend default and SQL suites were rerun before frontend acceptance. Public and authenticated built-app flows both passed; a browser assertion was corrected to compare rendered text consistently after confirming day regeneration preserved the other days.

## Browser flow details

The traveler creates a new account and plans Jeddah → Istanbul using future dates. Six flight/hotel offer cards load, and selected offers are sent to the planner. The resulting itinerary is saved automatically. The test toggles Saved, adds a favorite, removes a day activity, changes the budget, sees historical versions, regenerates the full trip, regenerates one day and checks another day remains unchanged. The booking dialog exposes HTTPS provider-search links and states that no reservation/payment occurred.

Dashboard shows one selected saved trip rather than duplicating its historical versions. Reload and a later login retain it. The session cookie is HttpOnly and SameSite=Lax. Arabic language survives reload, mobile Home/Dashboard/Plan have no horizontal overflow, and the mobile menu opens Profile and Sign out. Contact messages are verified in the actual database. No browser JavaScript page errors were observed.

## Visual review

The five public screens were compared against full-size current Figma screenshots. Desktop authentication uses the reference viewport sizes; Home, About and Contact use 1521px width. Dashboard and Plan follow the Figma structure while displaying real test-account data. Typography, spacing, asset decoding, image crops, borders, gradients and labels were reviewed. Responsive Arabic checks use a 390 × 844 viewport. This is a browser-based visual review, not a claim of identical raster output across every platform.

Current screenshots are included in `screenshots/`: Home, About, Contact, Login, Register, offer selection, Plan, Dashboard, and mobile Arabic views. All depicted offers/places are clearly marked development data. Georgia must be available to reproduce the reference display typography exactly; see `DESIGN.md`.

## Reproduce

The root README documents setup and test commands. `npm test` runs the default backend suite; `npm run test:mysql` requires a dedicated test database; `npm run test:e2e` requires the app running in mock mode against a disposable MySQL database and a Playwright-compatible Chromium. `E2E_BASE_URL` selects the test server and must match its `CLIENT_ORIGIN`.

A full e2e invocation runs two sequential journeys. It stores screenshots and a PDF under `test-results/`. Test accounts/contact records stay in the chosen test database. Local QA binaries, database files, credentials, browser traces and dependency folders are excluded from the source archive.

## Not verified or implemented

Actual external Amadeus/Google/AI calls require credentials and were not exercised. Google/Apple OAuth and password recovery are not implemented. No payment, booking confirmation, live availability guarantee, production deployment, cross-browser certification, formal accessibility audit or load test is claimed. Provider and operational limits are recorded in `STATUS.md` and `PROVIDERS.md`.
