# Figma implementation record

Visual authority: https://www.figma.com/design/0sMaf6U1ptQ0R8h2FTpGRG/Gilgamish?node-id=0-1

Figma was used read-only. Design context, frame screenshots, hierarchy, fonts and original asset bytes were retrieved before the frontend was implemented. The PDF and presentation remain supporting product references.

| Figma frame    | Node     | Reference size   | Route        |
| -------------- | -------- | ---------------- | ------------ |
| Home           | `9:2863` | 1520.8 × 3872.59 | `/`          |
| Sign in        | `9:2535` | 1536 × 677.6     | `/login`     |
| Create account | `9:2597` | 1520.8 × 723.575 | `/register`  |
| Dashboard      | `9:2666` | 1520.8 × 1715.5  | `/dashboard` |
| Plan           | `21:5`   | 1520.8 × 2293.9  | `/plans/:id` |
| Contact        | `21:355` | 1520.8 × 1211.29 | `/contact`   |
| About          | `21:448` | 1520.8 × 1437.94 | `/about`     |

## Design implementation

The cream `#fcf6ed`, surface `#fffbf6`, ink `#3b2214`, heading `#482a1d`, muted `#6e594b`, copper `#b47548`, brown `#713e26`, warm borders, gradients, rounded surfaces, 1280px container and 72.8px desktop header follow Figma. Layout, card proportions, hero imagery, typography and original vector icons were compared against the references. Home CTA glow and small image labels were corrected during the visual review.

The 46 original images and vectors are in `frontend/public/assets/figma`. `figma-assets.json` records their exact source node, byte count and SHA-256. No replacement stock photos, generated images or redrawn icons were used. Some source assets retain the extension supplied by Figma even where their bytes use a different raster encoding; all were decoded and browser-checked.

English display typography uses Georgia, with Times New Roman/serif fallback. Georgia is a system font and is not redistributed in this project. Desktop comparison used locally installed Georgia regular/italic. A correctly licensed webfont is required if identical display typography is needed on devices without Georgia. Inter and Noto Naskh Arabic are bundled through their Fontsource packages. Arabic extends the supplied English design with RTL logical properties and Arabic typography.

## Functional states

No additional static Figma frames were supplied for planner steps, offer selection, profile, empty/loading/error states or editing dialogs. These use the existing visual language. The Contact frame's layout has been preserved; its cards open a working message dialog rather than adding an unrelated form to the blank area. The placeholder contact details remain visible as designed, and the dialog identifies their status.

Dashboard and Plan display actual account and plan data. A new account starts empty; example Figma trips and prices are not silently inserted as user records. Budget labels describe estimates rather than actual spending. Plan length and card count follow the generated itinerary, so page height can differ from the static sample. Booking opens a provider-search explanation; social buttons show an unavailable state until OAuth exists.

The original Figma desktop compositions remain the visual reference. Responsive layouts stack cards/forms, retain account access in the mobile menu and preserve RTL/LTR behavior. Print styles hide navigation/actions and retain itinerary, budget and source warnings. Screenshots in `screenshots/` show the running application with synthetic development data.
