# Latvian Language B1 — Project Documentation

## Overview
- Browser-based collection of Latvian B1 study games built as static pages that can be hosted on GitHub Pages or any static server.
- Core canvas game (loaded from `index.html`) offers two modes: vocabulary matching (`src/lib/match.js`) and prefix forge (`src/lib/forge.js`), both rendered on a responsive `<canvas>` via helpers in `src/lib/render.js` and orchestrated by shared state in `src/lib/state.js`.
- Additional standalone games live under dedicated HTML entry points, including `darbibas-vards.html`, `conjugation-sprint.html`, `endings-builder.html`, `passive-lab.html`, `decl6-detective.html`, `duty-dispatcher.html`, `maini-vai-mainies.html`, `travel-tracker.html`, `character-traits.html`, `rakstura-ipasibas-match.html`, `rakstura-ipasibas-expansion.html`, and `week1.html`.
- Data lives under `data/` (including endings-builder payloads in `data/endings-builder/`); scripts in `scripts/` and legacy Python utilities within `scripts/legacy/` help regenerate those datasets.

## Technology Stack
- Plain ES modules executed in the browser; no bundler required.
- Styling via Bootstrap 5 (CDN) plus project styles in `styles.css`, `assets/styles.css`, and `src/games/endings-builder/styles.css`.
- Progressive Web App features through `manifest.json` and a custom service worker (`sw.js`).
- Optional data tooling: Node.js (for Excel-to-JSON conversion) and Python 3 (for inflection scraping).

## Repository Layout
- `index.html` — landing page that mounts the canvas game (`app.js`) and builds navigation cards.
- `app.js`, `src/lib/*.js` — shared canvas game logic (rendering, state, match, forge) and their helpers.
- `assets/` — vocabulary pairing game assets (`assets/app.js`, `assets/styles.css`).
- `data/words.json` — primary vocabulary list with conjugation tables consumed by several games.
- `src/games/endings-builder/` — modular endings builder implementation (`index.js`, drag-and-drop controller, normalization helpers, i18n loader).
- `scripts/` — developer tooling such as `xlsx_to_json.mjs`, `split-words-json.mjs`, `personality_csv_to_json.mjs`, `build_week1_offline.mjs`, `validate-data.mjs`, `validate-i18n.mjs`, `jsdom-setup.js`, and shared page bootstrap (`page-init.js`).
- `styles.css` — global visual language shared across pages.
- `test/` — Node test suites with DOM stubs for rendering units (run via `npm test`).
- `scripts/legacy/Latvian_Verb_Filler.py` — Python helper that fills verb conjugations by querying the Tezaurs inflection API into `data/legacy/verbs_conjugated.json`.

## Game Modules
### Canvas Match & Forge (`index.html` + `app.js`)
- Loads translations from `i18n/*.json` and unit indexes from `data/lv-en/units.json` or `data/lv-ru/units.json`, then per-unit JSON under `data/<lang>/units/`; falls back to `data/week1.offline.js` when fetch fails.
- Match mode (`src/lib/match.js`) dynamically sizes the deck based on viewport, tracks accuracy/time/streak, supports keyboard navigation, and pushes results into `state.results`.
- Forge mode (`src/lib/forge.js`) quizzes on verb prefixes, using hints from `state.DATA.notes` and dynamically shuffles plausible distractors.
- Rendering is abstracted through `src/lib/render.js`, which handles resolution scaling, rounded rectangles, typography, and celebratory confetti.
- Application state (`src/lib/state.js`) centralizes the pseudo-RNG, current mode, accessible click targets, redraw pipeline, and help text management.

### Darbibas Vards (`darbibas-vards.html`, `assets/app.js`)
- Presents two columns of cards (Latvian and translation), enforcing keyboard focus management and speech synthesis (optional) for Latvian pronunciations.
- Fetches the same `data/words.json` dataset; `language-select` toggles between English and Russian glosses.
- Supports configurable round size and persistent status feedback area for accessibility.

### Conjugation Sprint (`conjugation-sprint.html`, `src/games/conjugation-sprint/index.js`)
- Timed multiple-choice quiz that cycles through pronoun-tense combinations drawn from the conjugation tables embedded in `data/words.json`.
- Tracks score, streak, per-person accuracy, and limits sessions via `maxRounds`.
- Highlights correct answers after each round and exposes replay (`again`) and skip controls.

### Endings Builder (`endings-builder.html`, `src/games/endings-builder/*`)
- Drag-and-drop morphology trainer fed by schemas in `data/endings-builder/tables.json` and round definitions in `data/endings-builder/items.json`.
- `src/games/endings-builder/index.js` orchestrates the flow: loads localized strings, maintains progress in `localStorage`, enforces strict mode (diacritics), and delegates UI scaffolding to `game-shell.js`.
- Keyboard-accessible drag-and-drop via `src/games/endings-builder/dnd.js`; normalization helpers (`norm.js`) offer relaxed comparisons while strict mode enforces exact diacritics.
- Supports inline rule tables per schema by calling `getTable` from `src/games/endings-builder/endings-resolver.js`.

### Passive Lab (`passive-lab.html`, `src/games/passive-lab/index.js`)
- Exercises passive voice prompts using `data/passive-lab/items.json`.
- Page-specific styles live in `src/games/passive-lab/styles.css`.

### Decl6 Detective (`decl6-detective.html`, `src/games/decl6-detective/index.js`)
- Locative case detective game backed by `data/decl6-detective/items.json`.
- Uses `src/games/decl6-detective/styles.css` for layout.

### Duty Dispatcher (`duty-dispatcher.html`, `src/games/duty-dispatcher/index.js`)
- Dative-role assignment practice built from `data/duty-dispatcher/roles.json` and `data/duty-dispatcher/tasks.json`.
- Styling lives in `src/games/duty-dispatcher/styles.css`.

### Maini vai mainies? (`maini-vai-mainies.html`, `src/games/maini-vai-mainies/index.js`)
- Active vs. passive discrimination rounds loaded from `data/maini-vai-mainies/items.json`.
- Uses `src/games/maini-vai-mainies/styles.css`.

### Travel Tracker (`travel-tracker.html`, `src/games/travel-tracker/index.js`)
- Map-based routing game powered by `data/travel-tracker/routes.json` and the SVG map at `assets/img/travel-tracker/latvia.svg`.
- Styles live in `src/games/travel-tracker/styles.css`.

### Character Traits (`character-traits.html`, `rakstura-ipasibas-match.html`, `rakstura-ipasibas-expansion.html`)
- Personality vocabulary modes built on `src/games/character-traits*` modules and shared data from `data/personality/words.json`.
- Shared loader/normalizer lives in `src/lib/personality-data.js`.

### Week 1 (`week1.html`)
- Uses the main canvas game (`app.js`) with the offline pack in `data/week1.offline.js` and localized strings in `i18n/offline.js`.

## Internationalization
- Language files live under `i18n/` (`en.json`, `lv.json`, `ru.json`).
- `app.js` swaps button labels, help overlays, ARIA text, and triggers reloading of vocabulary translations.
- The endings builder loads localized strings on demand and persists the chosen language in `localStorage` (URL `?lang=` override available).
- When adding a new language, mirror keys present in `i18n/en.json` and ensure `sw.js` caches the new manifest entry.

## Data & Tooling
- **Vocabulary (`data/words.json`)**: Generated from `data/latvian_words_with_translations.xlsx` using `npm run build:data`. Columns `lv`, `en`, `ru`, optional `tag`, and optional `conj` populate each entry.
- **Chunked word payloads (`data/words/index.json`, `data/words/chunk-*.json`)**: Built via `npm run build:words:chunks` and loaded by `src/lib/words-data.js` for streaming fetches.
- **Offline fallback (`data/words.offline.js`)**: Embedded word list written by `npm run build:data` and used when chunk fetches fail.
- **Verb Inflections (`data/legacy/verbs_conjugated.json`)**: Optional enrichments produced by running `scripts/legacy/Latvian_Verb_Filler.py` (requires `requests`). The script retries Tezaurs API requests and maps MULTEXT-East tags into the JSON schema used by the sprint game.
- **Endings Data (`data/endings-builder/*.json`)**: Hand-authored schema tables and item definitions. When editing, keep UUID-like `id` stable because progress is keyed by it.
- **Units Data (`data/lv-en/units.json`, `data/lv-ru/units.json`)**: Used by the canvas match/forge game. Unit files live under `data/lv-en/units/` and `data/lv-ru/units/`. Ensure each entry declares which mini-games it supports (`games: ['match', 'forge']`) and includes translation keys for every supported UI language.

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
- Travel Tracker adopts the same toggle but also syncs the browser chrome color (via the `<meta name="theme-color">` tag) to the active palette tokens so PWA address bars match the UI.

## UI & Theming
- Global design tokens live in `styles.css` (`--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, `--accent-contrast`, plus helpers for hover/disabled states). Pages opt into them by referencing the variables; additional page-specific aliases can be layered inside each app container.
- `theme.js` reads the saved theme from `localStorage`, honours OS `prefers-color-scheme`, and updates the meta theme color so browsers tint the UI chrome correctly. Users can toggle modes via the navbar button; the preference persists until cleared.
- To sanity-check responsive layouts, run a static server (`npm install -g serve && serve .` or `python -m http.server 8000`) and open Chrome/Firefox dev tools. Test breakpoints used in QA: 320×568, 360×640, 390×844, 412×915, and 768×1024 (portrait + landscape). Ensure no horizontal scroll, buttons ≥44px, and focus outlines remain visible in both color modes.

### Travel Tracker Mobile Compatibility
- Travel Tracker (`travel-tracker.html`) now applies iPhone-specific breakpoints (430px, 414px, 390px, 375px) to manage safe-area padding, stack the score badges vertically, and prevent the bus map from overflowing short viewports.
- The `src/games/travel-tracker/styles.css` sheet sets `clamp()`-based map heights, dynamic grid columns for answer choices, and column-to-row fallbacks for landscape devices under 480px tall.
- Touch targets (buttons, inputs, choice chips) keep a minimum of 44–48px height, and the interactive panel gains scrollable overflow on narrow screens so restart/next controls stay reachable above the iOS home indicator.
- Safe-area insets are consumed through `env(safe-area-inset-*)` both on the outer container and the control panel to avoid clipping behind the notch or home indicator when `viewport-fit=cover` is active.

## Development Workflow
- Install dependencies: `npm install` (pulls `xlsx` for data conversion). For Python tooling, `pip install requests`.
- Build datasets: `npm run build:data` converts the Excel sheet to `data/words.json`; `npm run build:words:chunks` regenerates `data/words/index.json` + chunk files; `npm run build:personality` refreshes `data/personality/words.json`; `npm run build:offline` rebuilds offline bundles; `npm run build:all` runs the full pipeline. Run the Python script manually when refreshing verb inflections.
- Serve locally: use any static file server (e.g. `npx http-server .` or `python -m http.server`) from the project root; no build step is required for the web assets.
- Tests: execute `npm test` to run Node test suites under `test/` (bootstraps DOM APIs via `scripts/jsdom-setup.js`); DOM-heavy modules use stubs from `test/helpers/dom-stubs.js`.
- Linting: run `npm run lint` (ESLint + Prettier config) and `npm run format` for formatting.
- Validation: run `npm run validate:data` (JSON schemas + word chunk totals) and `npm run validate:i18n` (key parity across locale files).
- Type checks: `npm run typecheck` (tsconfig-based validation for editor tooling).

## Deployment Tips
- For GitHub Pages, deploy the root directory; ensure `assetUrl()` usage in `app.js` continues to resolve assets relative to `document.baseURI`.
- Bump `CACHE_VERSION` in `sw.js` after adding assets or changing caching strategy.
- Verify offline behavior using browser dev tools (Application ► Service Workers) before releasing.

## Start a simple server for local test
- python3 -m http.server 8000
- http://localhost:8000/endings-builder.html

## Extending the Project
- **Adding a new game**: Create an HTML entry point, add it to the navbar/landing cards, and consider registering it in `sw.js`.
- **Expanding vocabulary**: Append entries to `data/words.json`, update translations, and re-run any dependent tooling/tests.
- **Localization**: Copy `i18n/en.json` structure for new languages; ensure the service worker precache list is amended.
- **Data-driven rounds**: For endings builder and match/forge decks, maintain consistent schema IDs so existing localStorage progress and tests remain valid.
