# Gilgamish Smart

A bilingual travel planner built with React, JavaScript, Vite, ordinary CSS, Express and MySQL. The interface follows the supplied **Gilgamish Figma design**; Figma was read, never modified. The original backend checkpoint remains unchanged.

The app includes account sessions, a multi-step trip planner, flight/hotel selection, versioned itineraries, day editing and regeneration, budgets, saved trips, favorites, profile preferences, contact submissions, FAQ, Arabic RTL/English LTR, and print / Save as PDF.

**Start in mock mode.** MySQL is real; travel-provider results and AI scheduling use clearly identified development fixtures until external credentials are configured. Live providers and Google/Apple social login have not been verified or enabled. See [STATUS](docs/STATUS.md) and [VERIFICATION](docs/VERIFICATION.md).

## Quick start

Requirements: **Node.js 22.12 or newer**, npm, and MySQL 8.4 (or Docker Compose).

From this directory:

```sh
npm ci
cp .env.example .env
cp backend/.env.example backend/.env
```

On Windows PowerShell, `Copy-Item` also works. Choose your own database passwords: `MYSQL_PASSWORD` in root `.env` must equal `DB_PASSWORD` in `backend/.env`. Keep `USE_MOCK_SERVICES=true` for the first run. No API keys are needed in that mode.

```sh
docker compose up -d mysql
docker compose ps
```

Once MySQL is healthy:

```sh
npm run db:migrate
npm run dev
```

Open **http://localhost:5173**. Use that exact host so it matches `CLIENT_ORIGIN`. The API runs on port 4000; Vite proxies `/api`. `GET http://localhost:4000/api/health` checks MySQL and identifies mock/live mode.

If MySQL is already installed, create the database and a dedicated user instead of starting Docker:

```sql
CREATE DATABASE gilgamish CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'gilgamish'@'localhost' IDENTIFIED BY 'REPLACE_WITH_YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON gilgamish.* TO 'gilgamish'@'localhost';
```

Match `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` in `backend/.env`, then migrate. The initial schema is idempotent; it does not seed user accounts or trips. Docker persists its database in a named volume. Do not delete that volume to restart the app.

## Try a complete journey

1. Create an account with a password of at least 10 characters (maximum 72 UTF-8 bytes).
2. Open Trip Planner, search for **JED** and **IST**, and select Jeddah and Istanbul from the results. Choose future dates, travelers, currency and budget.
3. Choose interests/preferences, then search and select a flight and a hotel. Development offers are labeled as sample data.
4. Generate the plan. Plans are saved automatically; Save/Saved toggles that flag. Review the full-party cost estimate and missing-fee warnings.
5. Edit or regenerate a day, adjust the budget, or regenerate the trip. Each content change creates a new version; previous versions remain available under Modify.
6. Add a favorite and return to Dashboard. Saved trips show each trip's selected saved version. My Trips exposes trip editing and deletion.
7. Switch EN/AR. The language persists across reloads and signed-in sessions. Profile and Sign out are available in the mobile navigation menu.
8. Use Print / Save PDF on a plan. Choose your browser's Save as PDF destination.

Mock city lookup supports JED, RUH, IST, PAR, DXB, LON and AMM. Promotional destination imagery is copied from Figma; it does not imply that every depicted city has development inventory. Choose a returned city before searching.

Click a contact card to open the message form. Messages are stored in MySQL for review; email delivery is not configured. The contact details in Figma are placeholders.

## Built app / deployment

```sh
npm run build
npm start
```

For a local built-app run, keep `NODE_ENV=development` and set `CLIENT_ORIGIN=http://localhost:4000` in `backend/.env`; then open that address. `npm start` serves both the built frontend and `/api` from Express. Client-side routes work on direct navigation and reload.

For deployment, use a conventional **Node host with MySQL**, an HTTPS reverse proxy, `NODE_ENV=production`, and the exact HTTPS site URL as `CLIENT_ORIGIN`. Set `TRUST_PROXY=true` only behind exactly one trusted proxy. Production sessions require secure cookies. Run the migration against the intended database, preserve database backups, and run `npm run build` before starting the server. `npm run start:api` runs only the original API when a separate frontend host is preferred. No deployment has been performed.

`npm run preview` previews only the static frontend on port 4173; it is not the full application server.

## Configuration

All secrets belong in **backend/.env or server environment variables**, never frontend source or `VITE_*` variables. The browser calls relative `/api` URLs and stores no session token or password in localStorage.

| Variables                                                 | Purpose                                                |
| --------------------------------------------------------- | ------------------------------------------------------ |
| `NODE_ENV`, `PORT`, `CLIENT_ORIGIN`                       | Server mode, port (4000), exact allowed browser origin |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection                                       |
| `DB_SSL`, `DB_SOCKET`                                     | Optional verified database TLS or local socket         |
| `USE_MOCK_SERVICES`                                       | `true`: development fixtures; `false`: real providers  |
| `AMADEUS_ENV`                                             | `test` or `production`                                 |
| `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`              | Backend flight/hotel credentials                       |
| `GOOGLE_PLACES_API_KEY`                                   | Backend Places API (New) key                           |
| `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`                   | External structured-output AI service                  |
| `SESSION_DAYS`, `TRUST_PROXY`                             | Session lifetime and trusted-proxy setting             |

Read [PROVIDERS](docs/PROVIDERS.md) before switching to live mode. All live credentials are required together. Opaque revocable sessions, HttpOnly cookies and CSRF protection are already implemented; no JWT secret is required.

## Tests

```sh
npm test
npm run build
```

The default backend suite uses controlled provider responses and a test-only repository. The application server always uses MySQL.

For SQL integration, create a dedicated `gilgamish_test` database and set its credentials. The test rejects database names outside `gilgamish_test` / `gilgamish_test_<suffix>` and removes the users it creates.

```sh
TEST_DB_NAME=gilgamish_test npm run test:mysql
```

PowerShell:

```powershell
$env:TEST_DB_NAME = 'gilgamish_test'
npm run test:mysql
```

For browser acceptance, run the app in mock mode against a **separate test database**, then in another terminal:

```sh
npx playwright install chromium
npm run test:e2e
```

The default test address is `http://127.0.0.1:5173`; set the server's `CLIENT_ORIGIN` to that exact address for this run. Override `E2E_BASE_URL` to test the built app at `http://127.0.0.1:4000` and match `CLIENT_ORIGIN`. On PowerShell set environment variables using `$env:NAME = 'value'`. Browser tests create clearly named test accounts, trips and contact messages; retain only in a disposable test database. An already-installed Chromium can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

See [VERIFICATION](docs/VERIFICATION.md) for actual results and [DESIGN](docs/DESIGN.md) for Figma fidelity details.

## Project structure

| Path                           | Contents                                                                 |
| ------------------------------ | ------------------------------------------------------------------------ |
| `frontend/src/pages`           | Public, auth, dashboard, planner, plan and profile routes                |
| `frontend/src/components`      | Shared Figma layout, accessible fields/dialogs/status UI                 |
| `frontend/src/lib`             | API/CSRF client, session/language context, translations, original assets |
| `frontend/src/styles.css`      | Figma colors/type/layout, responsive RTL and print styles                |
| `frontend/public/assets/figma` | 46 original Figma images and vectors                                     |
| `backend/src`                  | Original Express routes, MySQL repository, planner and providers         |
| `database/schema.sql`          | 16 relational tables with ownership, versions and budgets                |
| `scripts`                      | Development launcher and same-origin built-app server                    |
| `backend/tests`, `tests/e2e`   | Backend/provider/SQL and browser acceptance checks                       |
| `docs`                         | API, provider setup, requirements, design and verification               |

## Current boundaries

External links open provider searches; they do not reserve an offer or confirm a booking. There is no payment engine. Unknown activity fees remain explicitly unknown. Live hotel pricing currently supports one room and adults only. Currency conversion, actual route times and holiday-specific openings are not verified. Google/Apple buttons honestly report that OAuth is unavailable; email/password login works. Password recovery and interest-based recommendations for undecided destinations remain unimplemented. Production hosting, live-provider verification, operational monitoring and multi-instance rate limiting are separate remaining work.
