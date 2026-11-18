# City travel guides — 26 October 2026

The homepage now includes a bilingual, responsive photo-card section titled **دليل السفر حسب المدينة / Travel guide by city**, following the user's reference image. It appears after the existing destinations section and before the closing call to action. Its ten cards come from the shared demo-city list and lead to public guide pages:

`/guides/damascus`, `/guides/istanbul`, `/guides/madinah`, `/guides/makkah`, `/guides/jeddah`, `/guides/riyadh`, `/guides/amman`, `/guides/dubai`, `/guides/cairo`, `/guides/paris`.

Each page includes country capital (explicitly distinguished from the destination city), currency, language, best season, visa guidance, customs, safety, money, practical cautions, source links and an editorial review date. It has a return link to the homepage section, related guides, and a trip-planner link with the destination preselected. Unknown slugs show a recovery page. No login is needed to read a guide.

## Content and maintenance

- `frontend/src/lib/cityGuides.js` contains the reviewed Arabic/English editorial text. Common country information is shared, while seasonal and practical advice is city-specific.
- This is curated content, not live visa determination, generated chatbot output, or a new backend/Google request per visit. Rules depend on nationality and may change. The page explicitly asks travelers to recheck official sources before booking.
- Sources consulted include official destination tourism sites, national visa portals, Nusuk, WMO climate data and government travel advisories. Links are provided next to each topic and collected below the guide.
- The Damascus guide explicitly attributes the FCDO's against-all-travel advice to its source and review date. The example claim that Arab visitors have easier visa access was not copied as a general rule.
- Seasonal recommendations describe typical climate; they are not weather forecasts or assurances of safe travel. Practical planning tips are editorial suggestions.
- Update the relevant facts and recheck sources before changing `guideReviewedAt`; do not update that date automatically on a build.

## Images and layout

- Existing project images are reused where appropriate. Five additional Commons images cover Madinah, Makkah, Jeddah, Amman and Riyadh. The previously mislabeled Riyadh image showed Dubai; the shared Riyadh image now uses an actual Riyadh skyline.
- Downloaded images live in `frontend/public/assets/guides/`. Author, source and licence metadata live in `frontend/src/lib/guideImageCredits.json` and are displayed as compact author/licence attribution beneath the relevant hero image. The separate photo-sources section and homepage link were removed at the user's request.
- The images are Wikimedia thumbnails, cropped through CSS for the display. Their licences apply to the photos; source links and licence links are retained.
- `scripts/fetch-guide-images.mjs` is a manual asset-maintenance helper. Pass one or more city codes to limit a refresh. It is not run by the app and requires network access.
- Cards use three columns on desktop, two on tablet and one on mobile, with rounded corners and a brown gradient matching the supplied reference. Both RTL and LTR are supported.

## Verification

`tests/e2e/city-guides.spec.js` exercises all ten home-card links in both languages, correct country-capital display, six topic cards, source links, image loading, title updates, mobile RTL layout, direct-route reload, return-to-section scrolling, overview text, three landmarks per city, absence of the removed banner/credits section and unknown-city recovery. The test uses Edge and reads public pages only; it does not create users, trips or contact submissions.

Run locally with `E2E_BASE_URL=http://localhost:5180` and `npx playwright test tests/e2e/city-guides.spec.js`. Review the generated screenshots under `test-results/screenshots/` after visual changes.

Verified on 26 October 2026: frontend production build passed; both targeted browser tests passed (all ten guides in both languages plus mobile/deep-link/recovery checks). Desktop home-card and detail-card screenshots and a mobile Arabic guide were visually inspected. No backend changes or database migration were needed.

## City introductions update — 26 October 2026

- Added bilingual introductions and three described landmarks per city in `frontend/src/lib/cityHighlights.js`, with official heritage/tourism links.
- Removed the standalone Damascus warning banner; the existing practical safety topic remains.
- Production build and both targeted browser tests passed (20 language/city combinations, mobile and recovery checks).
