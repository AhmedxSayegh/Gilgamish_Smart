# Gilgamish Smart — working checkpoint

Updated: 2026-10-30, Asia/Damascus. Read this file before resuming project work.

## Local runtime activation — 30 October 2026

Fixed ORIGIN_DENIED when the local frontend is opened as localhost:5173 instead of 127.0.0.1:5173. Development HTTP loopback origins now permit those two exact hostnames on the configured port, with matching credentialed CORS headers. Production and remote origins retain exact matching; other ports, protocols, deceptive hosts and null origins remain denied. Added four regression tests, including preflight and preserved authentication/CSRF checks. All 25 targeted origin/API/hotel tests pass. Restarted the verified API and confirmed both local origins return 200 with hotels=serpapi; an external origin and localhost:5180 return 403. Frontend source and IGNAV integration were not changed by this fix.

The user's screenshot of Development hotel cards came from the already-running API on port 4000, which still had hotels=mock loaded despite backend/.env selecting serpapi. Restarted only that verified local API process using the canonical backend directory; the frontend remains at http://127.0.0.1:5173. Health through that frontend now reports hotels=serpapi, flights=ignav, places/routes=google, plannerEngine=rules and mode=live. Other running backends were not touched.

An authenticated request through the real frontend proxy to /api/hotels/search returned 20 SerpApi hotels, zero development fixtures, in USD for one adult and 28–30 November 2026. The temporary diagnostic account and its trip were removed. No reservation/payment was made. Already displayed planner results need Refresh offers; saved mock plans retain their historical snapshots and need a new search/version for live prices. Evidence: docs/verification/serpapi-runtime.json. The implementation report below records the earlier code-delivery stage, before this runtime restart.

## Latest hotel integration — 29 October 2026

SerpApi Google Hotels is implemented and locally selected with `HOTELS_PROVIDER=serpapi`. Its key is read exclusively from the parsed `backend/.env` file. Search feeds the existing recommendations and planner; authenticated hotel details, prices and external booking-link APIs support both owned trip inputs and original saved-plan snapshots. React hotel cards and saved-plan summaries expose Book now / احجز الآن. No purchase, reservation, deployment or restart of existing application processes was performed. Restart an already running backend to load the new configuration. IGNAV service, booking component and tests have unchanged SHA-256 hashes.

Protection includes strict input/ownership checks, safe HTTPS links, normalized responses with no raw provider metadata/errors, five-minute caches and request coalescing, per-user limits, and per-process minute/day/concurrency limits. One room/adult-only hotel pricing remains the supported occupancy; child ages are absent from the trip contract and are never invented. No schema migration was required.

Verification: 14/14 new hotel unit/API tests; 88/89 total backend tests (the same pre-existing Ollama configuration expectation failed before this work); both MySQL integration checks passed using the dedicated test database; all seven exercised browser tests passed, with one city-guide browser-start failure passing on retry; final hotel/IGNAV browser rerun 3/3; production frontend build passed; secret scan found no SerpApi key in 30 frontend source/build files. Live SerpApi check returned 20 priced hotels and usable seller links using two upstream calls, without booking. Full scope, modified files and caveats: [SERPAPI-IMPLEMENTATION-REPORT](docs/SERPAPI-IMPLEMENTATION-REPORT.md), [integration guide](docs/SERPAPI-HOTELS.md). The older checkpoint below predates this hotel-provider decision.

## Current active decision — 26 October 2026

The user explicitly approved removing language models from trip planning. The active engine is `AI_PROVIDER=rules`: deterministic interest/proximity/budget selection, opening-aware scheduling and bounded agent repair. Qwen/Ollama and external-language-model planning services were removed from the application. The desktop launcher does not start or require Ollama. No new trained model or Colab dependency was introduced. See `docs/RULE-BASED-PLANNING.md`.

Google Places and Google Routes remain live. Flights/hotels remain mock until vendors and credentials are supplied. Destination lookup now defaults to `demo`: the user's fixed ten-city catalog (Damascus, Istanbul, Madinah, Makkah, Jeddah, Riyadh, Amman, Dubai, Cairo, Paris), shared with the frontend and searchable in Arabic/English. No global city-lookup vendor is required for this demo. Makkah has a distinct place/hotel center and uses Jeddah as its flight gateway; ground-transfer time/cost are unquoted and warned. Jeddah–Makkah flights are rejected as a ground-transfer pair. See `docs/DEMO-CITIES.md`. Informational chatbot/RAG remains absent and deferred. The `aiMode` health field is retained for compatibility, now `rules`; `plannerEngine=rules` describes the implementation.

Verified on 26 October: 59 backend tests, frontend build, and MySQL integration passed. The dedicated MySQL integration now uses the real rule-based planner rather than the fixture generator. Real Places + Routes + rules + SQL acceptance produced six activities across two days in 1.699 seconds, with six unknown fees explicitly retained. HTTP instrumentation allowed only places.googleapis.com (3 requests) and routes.googleapis.com (2 requests); no language-model calls. Evidence: `docs/verification/rules-live-journey.json`. The test account was deleted. START-GILGAMISH.cmd was exercised successfully without starting/checking Ollama; the running site's health confirms plannerEngine=rules. The timing is one acceptance example, not a general performance guarantee.

Demo-city update verified on 26 October: all 64 backend tests and the frontend build passed. The real Google Places service returned 30 usable, geographically filtered candidates for each of the ten cities, using 20 requests total; counts only are saved in `docs/verification/demo-cities.json`. This checks basic attraction/restaurant search, not full itineraries or travel inventory for all cities. The local backend was restarted; health through http://localhost:5180 confirms database/status=ok, destinations=demo, places/routes=google, flights/hotels=mock, plannerEngine=rules and chatbot=deferred. The prior MySQL/full-journey acceptance above remains a separate earlier check.

## User decisions

- New public city-guide feature: the homepage includes «دليل السفر حسب المدينة» with ten photo cards and bilingual public `/guides/:slug` pages. Each page contains capital/currency/language, six practical topics, official-source links, a review date, photo attribution and a prefilled trip-planner link. This is curated editorial content; the informational chatbot is still deferred. See `docs/CITY-GUIDES.md`. Five Commons images were added with licences; the old Riyadh image incorrectly showed Dubai and was corrected.
- City-guide verification: the production frontend build and both dedicated browser tests passed on 26 October. The tests exercised all ten public guides in English/Arabic, navigation, capital facts, images, mobile RTL, direct-route reload, attribution and unknown-city recovery. Desktop/mobile screenshots were visually inspected. The feature needs no database migration.

- Finish the backend and the trip-planning AI agent first, following the supplied project diagram WITHOUT the chatbot branches.
- Treat the chatbot as absent and deferred. Its agreed purpose and unresolved options are recorded in `docs/CHATBOT-DEFERRED.md`. Do not build chat routes, chat UI, RAG, or conversation-driven trip generation in the current work.
- Duffel was removed at the user's request. Do not restore it.
- Flight and hotel provider names have NOT been selected (confirmed by the user). Prepare independent provider contracts using the existing Amadeus adapter as a provisional implementation; do not claim an unknown provider will work merely by adding any API key.
- User will supply flight/hotel credentials locally later. Keep fixtures clearly labeled while credentials are unavailable. No payments, reservations, or bookings are authorized by this work.
- Google Places supplies the runtime place candidates. The Colab notebook is not an application dependency. Current ranking is explainable application logic, not a trained recommender.
- The trip-planning AI agent is separate from the deferred informational chatbot.

## Historical starting state — 25 October 2026

- Express/React/MySQL, account sessions, ownership, trip/plan versioning, editing, budgets and print views exist.
- Google Places is configured; flight/hotel/destination/routes and AI providers were configured as mock.
- Local Ollama inference code and an installed model exist from prior work; availability must be checked before claiming it is running.
- Historical `AGENT-WORKFLOW.md` referred to `journeyAgent.js`, which was absent. That document was not evidence of an integrated working agent.
- Independent provider selection exists. No live flight/hotel verification has been performed.
- Currency conversion helper exists but has no active flight-provider consumer after Duffel removal.

## Current scope

1. Bounded planning agent: provider tools, preference-aware candidate ranking, offer selection, rule-based generation, validation, evaluation, bounded revision, report, persistence.
2. Google candidate search by interests and geography; deterministic diversity and duplicate handling.
3. Preserve selected flight/hotel IDs; never invent provider inventory or known fees.
4. Keep unknown fees and estimated transfers explicit; integrate route checks when enabled.
5. Provider readiness/configuration guide and checks, tests, full plan persistence verification.
6. Update this checkpoint with actual outcomes and unverified boundaries when work completes.

See `docs/BACKEND-AGENT-PLAN.md` for the implementation sequence and verification record.

## Historical outcome — 25 October 2026 (superseded by rules above)

- Bounded journeyAgent.js is implemented and integrated in full/day generation. It validates model drafts, checks real route legs when enabled, evaluates known costs/interest coverage/repeats/empty days, revises at most three times, and persists the best valid full-plan report. Upstream outages fail instead of substituting data.
- Explicit flight/hotel choices survive regeneration unless the traveler requests cheaper alternatives or new choices; expired IDs require refresh.
- Google search uses interests with at most six queries, known-city planning scopes, closure filtering; ranking deduplicates and preserves interest/type variety.
- Local AI and Google Routes are now enabled after successful real checks. Health: aiMode=ollama, planningMode=agent, routes=google, places=google, chatbot=deferred. Flight/hotel/destination modes remain mock pending vendor selection.
- 55 backend tests, frontend build and dedicated MySQL integration passed. Real Google Places + Google Routes + local model + SQL acceptance produced six activities across two days in 65.238 seconds; test account was removed. See docs/verification/live-journey.json.
- Start locally with START-GILGAMISH.cmd. It uses the existing local-ai-runtime/start-local-ai.ps1 and MySQL service MySQLAyham2003. Site: http://localhost:5180. The PC must be on for local AI.
- Outstanding: vendor choice/credentials and final live flight/hotel testing, broader quality/long-trip load evaluation, deployment. Chatbot is intentionally absent; read docs/CHATBOT-DEFERRED.md when resuming it.

### City guide refinement — 26 October 2026
Removed the standalone Damascus warning banner and separate photo-sources UI. Compact required image attribution remains beneath relevant hero photos. Added bilingual city introductions and three landmarks to all ten city guides. Production build and two browser tests passed; mobile/desktop landmark layouts verified.

### Ready-made city plans — 26 October 2026
Homepage destination cards now link to public /destinations/:slug/plans pages. Each of the ten cities has three fictional sample itineraries (three, five and seven days), two positive illustrative reviews per plan, and consistent sample ratings. All profiles/reviews/plans are explicitly labeled demo examples, not previous-user submissions. Local bilingual editorial data; no Google calls, DB inserts or live prices. Existing guide cards still open city guides.
Validation: production build and four targeted browser tests passed; all ten cities in Arabic/English, expandable days/reviews, mobile layout, direct-route reload and recovery. Desktop/mobile screenshots inspected.

### Ignav booking links — 27 October 2026
Fixed missing Provider search controls: Ignav needs an on-demand /fares/booking-links lookup by providerOfferId. Added authenticated, CSRF-protected, rate-limited POST /api/flights/booking-links and a shared modal control for planner and saved plans. Preserves separate outbound/inbound purchase groups, filters unsafe URLs, shows empty/error/retry states, and makes no automatic purchase or external navigation. Backend restarted; 67 backend tests and production build passed. Live seller availability is not guaranteed; no paid live lookup used for validation.

27 October flight connectivity diagnosis: direct Ignav DXB-DAM 2026-11-15 to 2026-11-20, one adult, SAR returned 11 offers. Restarted API outside restricted runner. Verified via actual localhost /recommendations with a diagnostic account/trip: HTTP 200, three ranked flights and three hotels, flight currency SAR. Diagnostic account named Flight connection diagnostic uses example.invalid; logged out after test. Added Arabic Ignav error translations and visible error code; validation hints no longer shown for upstream failures.
