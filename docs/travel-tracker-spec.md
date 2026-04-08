# Travel Tracker — Materials Package (v1)

This folder contains ready-to-use materials for the **Travel Tracker** mini‑game.

## Files

- `data/travel-tracker/routes.json` — main content pack (≈30 routes across 6 levels).
- `data/travel-tracker/routes.csv` — CSV source (equivalent to JSON).
- `i18n/travel-tracker.lv.json`, `i18n/travel-tracker.en.json` — UI strings.
- `assets/img/travel-tracker/latvia.svg` — map with city markers (data-city attributes).
- `assets/img/travel-tracker/bus.svg` — bus icon.

## Notes

- City names in dataset match `data-city` attributes in the SVG for easy coordinate lookup.
- Validate answers by trimming/lowercasing and matching against `answers[]`.
- If you load the CSV, add a small Node build step to generate the JSON for the game.
- Persist progress in `localStorage` under key `llb1:travel-tracker:progress`.

## How to run

Serve the project with any static HTTP server (for example, `npx http-server .`) or open `travel-tracker.html` through your existing dev setup, then play the game from the `/travel-tracker.html` route.
