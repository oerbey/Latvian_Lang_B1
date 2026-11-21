# Latvian Language B — Technical Documentation

## 1. Project Scope

Latvian Language B is a static web app with 16 browser games for Latvian
language practice at B level.

Design goals:

- Keep runtime simple (plain HTML + ES modules, no bundler)
- Keep deployment simple (GitHub Pages / any static host)
- Keep quality high (lint, tests, schema validation, E2E smoke checks)

## 2. Runtime Architecture

### 2.1 Main Shell

- `index.html` loads the homepage game-card grid and canvas-based core
  modes.
- `scripts/page-init.js` handles shared bootstrapping (service worker
  registration, error handling, nav offset, offline banner).
- `scripts/nav.js` + `scripts/nav-config.js` provide shared navigation.
- `scripts/homepage.js` renders the game-card grid with filter/reveal
  logic.
- `theme.js` manages Bootstrap 5.3 light/dark theme toggle with
  localStorage persistence.

### 2.2 Core Canvas Modes

- `app.js` initialises the canvas app and mode switching (Match / Forge).
- `src/lib/match.js` and `src/lib/forge.js` implement primary gameplay
  loops.
- `src/lib/render.js` owns canvas rendering primitives.
- `src/lib/state.js` stores app-level state and click-target metadata.

### 2.3 Standalone Games

Each game has a dedicated HTML entry and module under `src/games/<game>/`.

Current standalone modules:

| Module folder                | Entry      | Extra modules                                                                                                                            |
| ---------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `character-traits`           | `index.js` | `styles.css`                                                                                                                             |
| `character-traits-expansion` | `index.js` | —                                                                                                                                        |
| `character-traits-match`     | `index.js` | `matching.js`                                                                                                                            |
| `conjugation-sprint`         | `index.js` | `logic.js`, `styles.css`                                                                                                                 |
| `decl6-detective`            | `index.js` | `data.js`, `progress.js`, `ui.js`, `styles.css`                                                                                          |
| `duty-dispatcher`            | `index.js` | `data.js`, `handlers.js`, `progress.js`, `ui.js`, `styles.css`                                                                           |
| `endings-builder`            | `index.js` | `data.js`, `dnd.js`, `endings-resolver.js`, `game-shell.js`, `handlers.js`, `norm.js`, `progress.js`, `rounds.js`, `ui.js`, `styles.css` |
| `english-latvian-arcade`     | `index.js` | `logic.js`, `styles.css`                                                                                                                 |
| `maini-vai-mainies`          | `index.js` | `styles.css`                                                                                                                             |
| `passive-lab`                | `index.js` | `data.js`, `i18n.js`, `progress.js`, `ui.js`, `styles.css`                                                                               |
| `sentence-surgery-passive`   | `index.js` | `data.js`, `progress.js`, `tokenize.js`, `styles.css`                                                                                    |
| `travel-tracker`             | `index.js` | `events.js`, `loaders.js`, `state.js`, `ui.js`, `utils.js`, `styles.css`                                                                 |
| `word-quest`                 | `main.js`  | `styles.css`                                                                                                                             |

### 2.4 Shared Libraries (`src/lib/`)

Reusable modules consumed by games and the core canvas:

- `aria.js` — ARIA live-region helpers
- `clickables.js` — canvas click-target registration
- `constants.js` — shared constants
- `dom.js` — DOM query/manipulation helpers
- `errors.js` — centralised error reporting
- `forge.js` — Forge mode logic
- `game-base.js` — base class / helpers for standalone games
- `i18n-format.js` — i18n string formatting
- `icon.js` — icon rendering
- `loading.js` — loading screen utilities
- `match.js` — Match mode logic
- `matching-game.js` — generic matching-game engine
- `matching-game/` — sub-modules (`constants.js`, `render.js`, `storage.js`)
- `paths.js` — URL / path utilities
- `personality-data.js` — personality vocabulary data loader
- `render.js` — canvas rendering primitives
- `reward.js` — reward / celebration effects
- `safeHtml.js` — safe HTML construction
- `sanitize.js` — input sanitisation
- `state.js` — app-level reactive state
- `status.js` — status bar helpers
- `storage.js` — localStorage abstraction
- `utils.js` — general-purpose utility functions
- `words-data.js` — word data loader (chunked JSON)

### 2.5 Platform accounts and progress

Shared navigation loads the pinned MSAL SDK on demand and verifies the active
account through the API. Account changes invalidate previous progress requests.
Callbacks return to a validated published page. Word Quest and Darbības Vārdi
use separate guest and account stores with revisioned cloud synchronization.

The summary API derives account metrics from the verified owner's partition.
My Progress shows both exercises, plus a catalogue of the remaining exercises.
See the [progress contracts and implementation plan](docs/platform-progress-plan.md).

## 3. Repository Layout

```
├── src/                    Game modules and shared runtime libraries
│   ├── games/              13 standalone game modules
│   └── lib/                Shared libraries (24 modules)
├── data/                   Source and generated datasets
│   ├── words.json          Main word list (generated)
│   ├── words/              Chunked word data (generated)
│   ├── personality/        Personality vocabulary (CSV source + JSON)
│   ├── lv-en/              Latvian-English forge/unit data
│   ├── lv-ru/              Latvian-Russian forge/unit data
│   ├── decl6-detective/    6th declension items
│   ├── duty-dispatcher/    Roles + tasks data
│   ├── endings-builder/    Endings tables + items + offline bundle
│   ├── maini-vai-mainies/  Reflexive verb items
│   ├── passive-lab/        Passive voice items
│   ├── travel-tracker/     Route data
│   └── legacy/             Legacy verb data
├── i18n/                   Locale files (lv, en, ru) + offline bundle
├── schemas/                JSON validation schemas
├── scripts/                Build, validation, and utility scripts
├── assets/                 Static assets (icons, images, previews)
├── test/                   Node test suites (mirrors src/ structure)
│   ├── games/              Game-specific tests
│   ├── lib/                Library tests
│   ├── scripts/            Build script tests
│   └── helpers/            Test helpers (dom-stubs.js)
├── e2e/                    Playwright smoke tests
├── docs/                   Specs, analysis docs, and roadmap
├── design-plan/            Early design prototypes
├── sentence_surgery_pack/  Sentence surgery dataset (CSV + JSON)
├── .github/workflows/      CI workflow (test.yml)
└── [root files]            HTML pages, configs, PWA files
```

## 4. Data and Build System

### 4.1 Canonical Sources

- Spreadsheet input: `data/latvian_words_with_translations.xlsx`
- CSV inputs: `data/personality/words.csv`, `data/duty-dispatcher/tasks.csv`
- Hand-authored JSON for game-specific packs

### 4.2 Generated Artifacts

Treat these as generated outputs — **do not hand-edit**:

- `data/words.json`
- `data/words/index.json` + `data/words/chunk-*.json`
- `data/personality/words.json`
- Offline bundles: `data/words.offline.js`, `data/week1.offline.js`,
  `data/endings-builder/offline.js`, `i18n/offline.js`
- API-local progress contracts and vocabulary IDs: `api/generated/progress-contracts/`

### 4.3 JSON Schemas

Schemas in `schemas/` validate key datasets:

- `words.schema.json`, `words-index.schema.json`
- `duty-dispatcher-roles.schema.json`, `duty-dispatcher-tasks.schema.json`
- `maini-vai-mainies-items.schema.json`
- `travel-tracker-routes.schema.json`

### 4.4 Build Commands

```bash
npm run build:data             # XLSX → words.json
npm run build:words:chunks     # Split words into chunks
npm run build:personality      # CSV → personality/words.json
npm run build:offline          # Generate offline JS bundles
npm run build:all              # Run entire pipeline
npm run build:auth-client      # Stage pinned public MSAL SDK/license (not a data build)
npm run build:progress-api     # Package shared progress contracts and vocabulary IDs for API deployment
npm run validate:progress-api  # Verify committed API artifacts without changing files
```

## 5. Quality Gates

### 5.1 Local Validation

```bash
npm run lint            # ESLint with Prettier compat
npm run format:check    # Prettier (printWidth: 100)
npm run typecheck       # TypeScript checking
npm test                # Node.js test runner
npm run validate:data   # JSON schema validation
npm run validate:i18n   # Locale key parity
npm run test:e2e        # Playwright Chromium smoke tests
```

### 5.2 CI Workflow

`.github/workflows/test.yml` runs on PRs and pushes to `main`,
split into two jobs:

1. **Quality + Unit** (`quality`):
   lint → format check → typecheck → coverage → data validation →
   i18n validation

2. **E2E** (`e2e`, runs after `quality`):
   Playwright Chromium smoke tests with failure artifact upload

Workflow features:

- Concurrency cancellation per ref
- Least-privilege permissions (`contents: read`)
- Dependency caching + Playwright browser caching
- 14-day retention for failure artifacts

### 5.3 Test Coverage

Unit tests mirror the source tree under `test/`:

- `test/lib/` — 11 test files for shared libraries
- `test/games/` — tests for 5 game modules (conjugation-sprint,
  endings-builder, english-latvian-arcade, sentence-surgery-passive,
  travel-tracker)
- `test/scripts/` — build script tests
- `test/helpers/dom-stubs.js` — JSDOM stubs for Node environment

E2E tests in `e2e/`:

- `smoke.spec.js` — per-game smoke tests
- `game-pages.spec.js` — page-load validation

## 6. PWA and Offline

- `sw.js`: Service worker with cache strategies and offline behaviour
- `manifest.json`: Install metadata and icons
- `scripts/page-init.js`: Service worker registration and update prompt

Service worker v35 in current source precaches the shared account/progress modules and
the My Progress dashboard. Private
APIs, `/.auth` and callback HTML/JS bypass caches. Guest play can work offline
after assets are cached. If identity cannot be verified on reload, Word Quest
opens the guest namespace; account-local progress remains stored for the next
verified sign-in. See [offline and recovery details](docs/word-quest-email-auth.md).

When adding new pages or assets that must work offline:

1. Add assets to service-worker cache lists.
2. Bump `CACHE_VERSION` in `sw.js`.
3. Re-test both online and offline behaviour.

## 7. Configuration Files

| File                   | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `.nvmrc`               | Node.js version (20)                               |
| `.prettierrc.json`     | Prettier config (`printWidth: 100`, single quotes) |
| `.eslintrc.cjs`        | ESLint config with Prettier compatibility          |
| `.editorconfig`        | Editor whitespace / encoding settings              |
| `tsconfig.check.json`  | TypeScript checking config (no emit)               |
| `jsconfig.json`        | VS Code JavaScript project settings                |
| `playwright.config.js` | Playwright E2E configuration                       |
| `.husky/`              | Git hooks (pre-commit: lint-staged)                |

## 8. Documentation Governance

Documentation is intentionally scoped to active references:

- Keep technical truth in `README.md` and this file (`documentation.md`)
- Use `AGENTS.md` for contributor/agent coding guidelines
- Keep game-level behaviour and specs under `docs/*-spec.md`
- Keep the development log in `progress.md`
- Remove temporary tracker / task-list markdown instead of leaving stale
  checklists

## 9. Deployment Notes

- Deploy the root directory to GitHub Pages (or any static host)
- Validate service-worker updates whenever cached assets change
- Prefer runtime paths that work under sub-path hosting
