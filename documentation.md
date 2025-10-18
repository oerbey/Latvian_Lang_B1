# Latvian Language B1 — Project Documentation

## Overview
- Browser-based collection of Latvian B1 study games built as static pages that can be hosted on GitHub Pages or any static server.
- Core canvas game (loaded from `index.html`) offers two modes: vocabulary matching (`src/match.js`) and prefix forge (`src/forge.js`), both rendered on a responsive `<canvas>` via helpers in `src/render.js` and orchestrated by shared state in `src/state.js`.
- Additional standalone games live under dedicated HTML entry points: `darbibas-vards.html` (drag-and-match vocabulary), `conjugation-sprint.html` (timed conjugation quiz), and `endings-builder.html` (morphology drag-and-drop trainer).
- Data is shipped as JSON in `data/` and `src/data/`; scripts in `scripts/` and root Python utilities help regenerate those datasets.

## Technology Stack
- Plain ES modules executed in the browser; no bundler required.
- Styling via Bootstrap 5 (CDN) plus project styles in `styles.css`, `assets/styles.css`, and `src/css/endings-builder.css`.
- Progressive Web App features through `manifest.json` and a custom service worker (`sw.js`).
- Optional data tooling: Node.js (for Excel-to-JSON conversion) and Python 3 (for inflection scraping).

## Repository Layout
- `index.html` — landing page that mounts the canvas game (`app.js`) and builds navigation cards.
- `app.js`, `src/*.js` — shared canvas game logic (rendering, state, match, forge) and their helpers.
- `assets/` — vocabulary pairing game assets (`assets/app.js`, `assets/styles.css`).
- `data/words.json` — primary vocabulary list with conjugation tables consumed by several games.
- `src/js/` — modular endings builder implementation (`endings-builder.js`, drag-and-drop controller, normalization helpers, i18n loader).
- `scripts/` — developer tooling such as `xlsx_to_json.mjs` and shared page bootstrap (`page-init.js`).
- `styles.css` — global visual language shared across pages.
- `test/` — Node test suites with DOM stubs for rendering units (run via `npm test`).
- `Latvian_Verb_Filler.py` — Python helper that fills verb conjugations by querying the Tezaurs inflection API into `verbs_conjugated.json`.

## Game Modules
### Canvas Match & Forge (`index.html` + `app.js`)
- Loads translations from `i18n/*.json` and vocabulary units from `data/units.json` generated offline (see Data Tools section).
- Match mode (`src/match.js`) dynamically sizes the deck based on viewport, tracks accuracy/time/streak, supports keyboard navigation, and pushes results into `state.results`.
- Forge mode (`src/forge.js`) quizzes on verb prefixes, using hints from `state.DATA.notes` and dynamically shuffles plausible distractors.
- Rendering is abstracted through `src/render.js`, which handles resolution scaling, rounded rectangles, typography, and celebratory confetti.
- Application state (`src/state.js`) centralizes the pseudo-RNG, current mode, accessible click targets, redraw pipeline, and help text management.

### Darbibas Vards (`darbibas-vards.html`, `assets/app.js`)
- Presents two columns of cards (Latvian and translation), enforcing keyboard focus management and speech synthesis (optional) for Latvian pronunciations.
- Fetches the same `data/words.json` dataset; `language-select` toggles between English and Russian glosses.
- Supports configurable round size and persistent status feedback area for accessibility.

### Conjugation Sprint (`conjugation-sprint.html`, `src/conjugation-sprint.js`)
- Timed multiple-choice quiz that cycles through pronoun-tense combinations drawn from the conjugation tables embedded in `data/words.json`.
- Tracks score, streak, per-person accuracy, and limits sessions via `maxRounds`.
- Highlights correct answers after each round and exposes replay (`again`) and skip controls.

### Endings Builder (`endings-builder.html`, `src/js/*`)
- Drag-and-drop morphology trainer fed by schemas in `src/data/endings.json` and round definitions in `src/data/endings-items.json`.
- `src/js/endings-builder.js` orchestrates the flow: loads localized strings, maintains progress in `localStorage`, enforces strict mode (diacritics), and delegates UI scaffolding to `game-shell.js`.
- Keyboard-accessible drag-and-drop via `src/js/dnd.js`; normalization helpers (`norm.js`) offer relaxed comparisons while strict mode enforces exact diacritics.
- Supports inline rule tables per schema by calling `getTable` from `endings-resolver.js`.

## Internationalization
- Language files live under `i18n/` (`en.json`, `lv.json`, `ru.json`).
- `app.js` swaps button labels, help overlays, ARIA text, and triggers reloading of vocabulary translations.
- The endings builder loads localized strings on demand and persists the chosen language in `localStorage` (URL `?lang=` override available).
- When adding a new language, mirror keys present in `i18n/en.json` and ensure `sw.js` caches the new manifest entry.

## Data & Tooling
- **Vocabulary (`data/words.json`)**: Generated from `data/latvian_words_with_translations.xlsx` using `npm run build:data`. Columns `lv`, `eng`, `ru`, and optional tags populate each entry.
- **Verb Inflections (`verbs_conjugated.json`)**: Optional enrichments produced by running `Latvian_Verb_Filler.py` (requires `requests`). The script retries Tezaurs API requests and maps MULTEXT-East tags into the JSON schema used by the sprint game.
- **Endings Data (`src/data/*.json`)**: Hand-authored schema tables and item definitions. When editing, keep UUID-like `id` stable because progress is keyed by it.
- **Units Data (`data/units.json` et al.)**: Used by the canvas match/forge game. Ensure each entry declares which mini-games it supports (`games: ['match', 'forge']`) and includes translation keys for every supported UI language.

## Progressive Web App
- `sw.js` precaches the core pages, assets, and i18n files. Update `CORE_ASSETS` when adding new entry points or static resources that should be offline-ready.
- Network strategy: JSON vocabulary uses network-first with cache fallback; other assets prefer cache-first.
- `scripts/page-init.js` registers the service worker post-load and applies mobile scroll fixes to avoid touch traps.
- `manifest.json` holds the base PWA metadata; populate `icons` before shipping to storefronts.

## Accessibility & UX Notes
- Canvas game mirrors interactions into a screen-reader-only `<ul>` via `drawMatch` and `drawForge`, exposing each option as a `<button>`.
- Clickable regions are tracked in `state.clickables` for hit testing on pointer and touch events.
- `assets/app.js` and endings builder emit status updates through `aria-live` regions and ensure keyboard focus management.
- Theme toggling (`theme.js`) persists Bootstrap color mode and updates icon visibility; works across all pages sharing the navbar.

## Development Workflow
- Install dependencies: `npm install` (pulls `xlsx` for data conversion). For Python tooling, `pip install requests`.
- Build datasets: `npm run build:data` converts the Excel sheet to `data/words.json`. Run the Python script manually when refreshing verb inflections.
- Serve locally: use any static file server (e.g. `npx http-server .` or `python -m http.server`) from the project root; no build step is required for the web assets.
- Tests: execute `npm test` to run Node test suites under `test/`. DOM-heavy modules use stubs from `test/helpers/dom-stubs.js`.
- Linting is not configured; rely on browser console and tests for feedback.

## Deployment Tips
- For GitHub Pages, deploy the root directory; ensure `assetUrl()` usage in `app.js` continues to resolve assets relative to `document.baseURI`.
- Bump `CACHE_VERSION` in `sw.js` after adding assets or changing caching strategy.
- Verify offline behavior using browser dev tools (Application ► Service Workers) before releasing.

## Extending the Project
- **Adding a new game**: Create an HTML entry point, add it to the navbar/landing cards, and consider registering it in `sw.js`.
- **Expanding vocabulary**: Append entries to `data/words.json`, update translations, and re-run any dependent tooling/tests.
- **Localization**: Copy `i18n/en.json` structure for new languages; ensure the service worker precache list is amended.
- **Data-driven rounds**: For endings builder and match/forge decks, maintain consistent schema IDs so existing localStorage progress and tests remain valid.

