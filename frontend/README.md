# React frontend

React + JavaScript + Vite + ordinary CSS. See the root README for database setup and commands.

## Routes

| Route                                 | Screen                                                       |
| ------------------------------------- | ------------------------------------------------------------ |
| `/`, `/about`, `/contact`             | Public Figma pages; contact dialog stores messages           |
| `/login`, `/register`                 | Figma auth screens, email/password sessions                  |
| `/dashboard`                          | Budget overview, selected saved plans, favorites, FAQ        |
| `/planner`, `/planner?edit=<trip-id>` | Trip details, preferences, flight/hotel selection            |
| `/trips`                              | All owned trips, edit/delete controls                        |
| `/plans/:id`                          | Versioned itinerary, budgets, day edits, regeneration, print |
| `/profile`                            | Name, language and planning defaults                         |

Protected routes preserve the intended internal destination through sign-in. The API client uses relative `/api`, cookies and an in-memory CSRF token. Only the language preference is stored in localStorage.

`components/Layout.jsx` provides shared navigation/footer and mobile account actions. `components/UI.jsx` provides labeled fields, dialogs with native focus handling, city search, loading/error and empty states. `lib/context.jsx` manages session restoration and bilingual state; translated text lives alongside pages and in `lib/locales.js`. `styles.css` includes responsive layouts, RTL logical properties and print rules.

The seven supplied Figma frames were inspected before implementation. Their original images/icons are in `public/assets/figma`, with source-node and checksum provenance in `docs/figma-assets.json`. No Figma changes were made. New functional states use the same colors, typography, spacing and component language. See `docs/DESIGN.md` for exact frame IDs and the Georgia font dependency.

The app does not fake social OAuth or confirmed reservations. Live provider credentials remain server-side. Missing/error/loading states surface real API results; mock data is labeled.
