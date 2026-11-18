# Gilgamish Smart requirements and decisions

## Source priority

1. Current user instruction: Figma is the highest-priority visual source; change implementation to match Figma, never Figma to match implementation.
2. Pasted implementation instructions: actual React/Vite + Node/Express + MySQL application, with real provider adapters and separate development mock mode.
3. GP1_Final_report_G2.pdf, all 46 pages reviewed; diagrams and UI screenshots inspected.
4. Gilgamish Smart Presentation.pptx, all 20 slides reviewed, including speaker notes where available.

The report and presentation describe a three-layer travel planning system. The later implementation instructions resolve the report's occasional booking/payment terminology: this project redirects to external providers and does not accept payments or issue tickets.

## Traceability

| Requirement                          | Implementation / current state                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Registration, login, session, logout | Figma auth screens, session context, bcrypt, revocable cookie sessions, CSRF; browser tested                |
| Profile and preferences              | Editable profile, persisted language and planning defaults                                                  |
| Travel details                       | Multi-step planner, validated trip CRUD, verified city selection and explicit currency                      |
| Flight and hotel search              | Amadeus adapter; result cards, explicit selections, quote/source labels; real calls pending keys            |
| Verified places                      | Google Places New adapter, source labels, candidate-based editor and map links                              |
| Personalized plans                   | Deterministic ranking, structured external AI, validation and generate/loading/retry UI; mock flow verified |
| Cost estimates                       | Integer-cent arithmetic, DECIMAL storage, budget breakdown, unknown-fee warnings and cheaper-option control |
| Modify and regenerate                | Day/full regeneration, activity editor, immutable versions and version picker                               |
| Saved plans/favorites                | My Trips, selected saved-trip cards, favorites and persisted flags                                          |
| Booking redirection                  | Explicit provider-search dialog; no confirmed reservations or payment                                       |
| Contact                              | Figma Contact screen, message dialog, validated MySQL submission and receipt                                |
| Arabic/English                       | Translated UI, persisted language, RTL/LTR, mobile layout and navigation verification                       |
| Export                               | Browser print and Save as PDF stylesheet; generated PDF verified                                            |
| Destination recommendation           | City lookup works; interest-based recommendations for undecided destinations remain optional/unimplemented  |
| FAQ                                  | Dashboard FAQ accordion with accurate product scope                                                         |
| Social sign-in                       | Figma buttons retained with unavailable states; Google/Apple OAuth remains unimplemented                    |

## Design observations from supporting screenshots

The supplied screenshots use warm cream surfaces, brown text, serif display headings, rounded brown gradient actions, a Gilgamish logo, and Istanbul heritage photography. Home has a panoramic hero; auth pages use an image/form split. Slide 17's Figma overview also shows designed Dashboard and Plan pages, so these belong to the locked-screen scope alongside Home, About, Contact, Register and Login. The authoritative Figma frames were subsequently read. Their exact colors, fonts, original assets and layout informed the implementation; supporting report images did not override Figma. See `DESIGN.md`.

## Engineering decisions

- Use opaque server-backed sessions as the explicitly permitted secure alternative to JWT. Logout revokes the session immediately. Store only the session token hash in MySQL.
- Persist plan versions transactionally. Lock the trip row while allocating versions and changing the selected plan. Day edits preserve every other day.
- Store monetary values as DECIMAL in MySQL and calculate using integer cents in JavaScript. All supported currencies currently use two decimal places. No currency conversion is implemented.
- Flight prices cover all passengers for the return journey. Mock hotel prices cover the full stay and all generated rooms. The real hotel adapter currently supports one room with adults only; unknown child occupancy is rejected.
- Food allowance is per traveler per calendar day. Transport allowance is per group per calendar day. Miscellaneous costs cover the whole trip. These are user-supplied allowances, not provider quotes.
- A budget with unknown activity fees is an incomplete estimate, even when the known subtotal is below the budget. Unknown fees are never silently converted into a known zero entrance price.
- Arrival buffer is two hours after local arrival; return buffer is three hours before local departure. Regular weekly opening hours and schedule overlaps are enforced. Special holiday closures and actual route travel times remain unverified.
- Google place IDs and the user's schedule are persistent. Live place details are refreshed for display and not cached or snapshotted in MySQL. Development place fixtures may be snapshotted.
- Figma access was restored before the frontend was implemented. All seven supplied screens were inspected; new workflow states extend the same design system. No Figma content was changed.
- The mandatory Express/MySQL server is intended for a conventional Node host with MySQL connectivity. Sites Worker hosting cannot run this exact stack; no hosting conversion or deployment was performed.
