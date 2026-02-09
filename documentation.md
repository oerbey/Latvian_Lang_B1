# Latvian Language B1 — Technical Documentation

## 1. Project Scope

Latvian Language B1 is a static web app with multiple browser games for Latvian language practice.

Design goals:

- Keep runtime simple (plain HTML + ES modules)
- Keep deployment simple (GitHub Pages/static hosting)
- Keep quality high (lint, tests, schema validation, E2E smoke checks)

## 2. Runtime Architecture

### 2.1 Main Shell

- `index.html` loads the home surface and canvas-based core modes.
- Shared bootstrapping is handled by `scripts/page-init.js` (service worker, error handling, nav offset, offline banner).
- Shared navigation comes from `scripts/nav.js` + `scripts/nav-config.js`.

### 2.2 Core Canvas Modes

- `app.js` initializes the canvas app and mode switching.
- `src/lib/match.js` and `src/lib/forge.js` implement primary gameplay loops.
- `src/lib/render.js` owns canvas rendering primitives.
- `src/lib/state.js` stores app-level state and click-target metadata.

### 2.3 Standalone Games

Each game has a dedicated HTML entry and module under `src/games/<game>/`.

Current standalone modules include:

- `conjugation-sprint`
- `endings-builder`
- `passive-lab`
- `sentence-surgery-passive`
- `decl6-detective`
- `duty-dispatcher`
- `maini-vai-mainies`
- `travel-tracker`
- `character-traits`
- `character-traits-match`
- `character-traits-expansion`
- `english-latvian-arcade`
- `word-quest`

## 3. Repository Layout

- `src/`: game modules and shared runtime libraries
- `data/`: source and generated datasets
- `i18n/`: locale files and offline packs
- `scripts/`: build/validation/util scripts
- `assets/`: static assets and legacy game assets
- `test/`: Node test suites (mirrors runtime modules)
- `e2e/`: Playwright smoke tests
- `docs/`: specs, analysis docs, and roadmap docs

## 4. Data and Build System

### 4.1 Canonical Sources

- Spreadsheet/CSV inputs (e.g., personality vocabulary CSV)
- Hand-authored JSON for game-specific packs

### 4.2 Generated Artifacts

Treat these as generated outputs:

- `data/words.json`
- `data/words/index.json` + `data/words/chunk-*.json`
- `data/personality/words.json`
- Offline bundles (`data/*.offline.js`, `i18n/offline.js`)

### 4.3 Build Commands

```bash
npm run build:data
npm run build:words:chunks
npm run build:personality
npm run build:offline
npm run build:all
```

## 5. Quality Gates

### 5.1 Local Validation

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run validate:data
npm run validate:i18n
npm run test:e2e
```

### 5.2 CI Workflow

`.github/workflows/test.yml` is split into two jobs:

- `quality`: lint, formatting check, typecheck, coverage, data/i18n validation
- `e2e`: Playwright Chromium smoke tests

Workflow includes:

- concurrency cancellation per ref
- least-privilege permissions (`contents: read`)
- dependency caching and Playwright browser caching
- failure artifact upload for Playwright output

## 6. PWA and Offline

- `sw.js`: cache strategies + offline behavior
- `manifest.json`: install metadata/icons
- `scripts/page-init.js`: service worker registration and update prompt

When adding new pages/assets that must work offline:

1. Add assets to service-worker lists/handling.
2. Bump `CACHE_VERSION` in `sw.js`.
3. Re-test online and offline behavior.

## 7. Documentation Governance

Documentation is intentionally scoped to active references:

- Keep technical truth in `README.md` and this file (`documentation.md`)
- Keep game-level behavior/specs under `docs/*-spec.md`
- Keep architecture deep dives in `ideas/architectural-review-2026/`
- Remove completed tracker/task-list markdown files instead of leaving stale checklists

## 8. Concept Design Sandbox

A non-production concept UI is available at `concept/modern-home.html`.

Rules for concept pages:

- No integration into production nav/home by default
- Keep assets scoped to `concept/` files
- Safe to delete if design direction is rejected

## 9. Deployment Notes

- Deploy root directory to GitHub Pages (or any static host)
- Validate service-worker updates whenever cached assets change
- Prefer runtime paths that work under subpath hosting
