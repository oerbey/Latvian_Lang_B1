# Latvian Language B — Technical Documentation

## 1. Project Scope

Latvian Language B has a static frontend with 16 browser games for Latvian
language practice at B level. Word Quest also uses an Azure managed Functions
API and Cosmos DB for authenticated cloud progress.

Design goals:

- Keep runtime simple (plain HTML + ES modules, no bundler)
- Support static hosting for local gameplay and Azure hosting for account/cloud features
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
- `email-auth.js` — shared MSAL sign-in, verified owner session, token renewal and logout
- `cloud-progress.js` — owner-bound authenticated progress requests
- `auth-probe-errors.js` — safe callback error codes; the probe APIs are retired
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

### 2.5 Word Quest Authentication and Progress

This describes the code deployed to Azure production on 2026-10-16 at
`7726f787768b3975c04be3a0692222218f64751e`, with production acceptance completed
on 2026-10-18. See [the cutover record](docs/email-password-production-cutover.md)
for live test evidence, environment separation and recovery.

- The browser uses the pinned MSAL SDK and hosted External ID email/password
  flow. Microsoft hosts credential entry, verification and password recovery.
  `auth-probe.html` is the retained exact callback URI, now a minimal return page
  using `src/auth-callback.js`; it is not a diagnostic test page.
- `email-auth.js` initializes MSAL, acquires the progress API access token and
  asks the API for a verified hashed owner. Tokens remain in MSAL's session
  cache. Logout sends the active account's provider-issued hint, clears every
  cached app account and cancels stale progress work.
- Requests send tokens in `X-Latvian-Authorization: Bearer <access-token>` because
  the managed SWA gateway can overwrite standard Authorization. The API validates
  signature, configured issuer/tenant/audience, lifetime, SPA client, delegated
  scope and user claim before touching Cosmos. Old SWA principal headers and
  browser-supplied owner fields do not grant access.
- The owner is `extid:` plus SHA-256 of verified tenant ID, NUL and user `oid`.
  Records use that owner as `/userId` partition key and `${ownerKey}:word-quest`
  as ID, with private ownership schema 2 metadata. Dev and production have
  distinct SPA/API registrations and use `progress_dev` / `progress_prod`.
- Local guest and account progress occupy separate namespaces. There is no
  guest/legacy import or account linking. Writes retain pending local state
  until acknowledged; revision conflicts require an explicit choice and
  authentication failures require renewed sign-in.

| Endpoint                                 | Purpose                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /api/health`                        | Public API liveness                                                                   |
| `GET /api/authConfig`                    | Approved public browser settings, no credentials                                      |
| `GET /api/authSession`                   | Validate the access token and return only the hashed owner                            |
| `GET /api/getProgress?gameId=word-quest` | Return that owner's item or literal JSON `null` when absent                           |
| `POST /api/saveProgress`                 | Validate `gameId`, `data`, `expectedRevision`; save to the verified owner's partition |

Authentication/session/progress responses use no-store. API errors remain
generic; invalid authentication does not reach storage. Missing cloud state must
be explicit JSON: Azure Functions omits `jsonBody: null`, so the handler sends
the literal `null` body. `/api/authProbe`, `/api/authProbeConfig` and the migration
endpoint are removed. `/login` and `/logout` return to Word Quest; its buttons
perform the actual SDK operations.

For local setup, install both root and `api/` dependencies. Use
`api/local.settings.json.example` as the configuration template for a local
Functions host and keep real values outside source control. The root static
server does not start Functions. The current browser client accepts only the
same-origin `/auth-probe.html` callback; real local authentication requires a
matching Dev SPA redirect registration. Existing automated tests mock identity
and storage instead of using live credentials or Cosmos records.

## 3. Repository Layout

```
├── src/                    Game modules and shared runtime libraries
│   ├── games/              13 standalone game modules
│   └── lib/                Shared gameplay, authentication and cloud helpers
├── api/                    Managed Node Functions, separate lockfile and tests
│   ├── src/functions/      HTTP handlers
│   ├── src/lib/            JWT validation, Cosmos and progress rules
│   └── test/               API tests with synthetic identities/storage
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
├── .github/workflows/      Reusable CI, automatic Dev and manual production release
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
```

## 5. Quality Gates

### 5.1 Local Validation

```bash
npm run lint            # ESLint with Prettier compat
npm run format:check    # Prettier (printWidth: 100)
npm run typecheck       # TypeScript checking
npm test                # Node.js test runner
npm test --prefix api   # API authentication/progress tests
npm run validate:data   # JSON schema validation
npm run validate:i18n   # Locale key parity
npm run test:e2e        # Playwright Chromium smoke tests
```

### 5.2 CI Workflow

`.github/workflows/test.yml` runs on PRs, pushes to `main`/`dev`, manual dispatch
and workflow calls, split into three jobs:

1. **Quality + Unit** (`quality`):
   lint → format check → typecheck → coverage → data validation →
   i18n validation

2. **API Quality + Unit** (`api-quality`):
   separate API dependency installation and Node tests

3. **E2E** (`e2e`, runs after both unit jobs):
   Playwright Chromium smoke/authentication tests with failure artifact upload

Workflow features:

- Concurrency cancellation per ref
- Least-privilege permissions (`contents: read`)
- Dependency caching + Playwright browser caching
- 14-day retention for failure artifacts
- Optional `commit_sha` input checked out by every job for the production release gate

### 5.3 Test Coverage

Unit tests mirror the source tree under `test/`:

- `test/lib/` — shared helpers, authentication sessions and cloud transport
- `test/games/` — tests for 5 game modules (conjugation-sprint,
  endings-builder, english-latvian-arcade, sentence-surgery-passive,
  travel-tracker)
- `test/scripts/` — build script tests
- `test/helpers/dom-stubs.js` — JSDOM stubs for Node environment
- `api/test/` — signed-token validation, partition ownership, revisions and response serialization

E2E tests in `e2e/`:

- `smoke.spec.js` — per-game smoke tests
- `game-pages.spec.js` — page-load validation
- `email-auth-discovery.spec.js` — real SDK discovery and synthetic callback/logout flows
- `word-quest-auth.spec.js` — cloud save/restore, account changes, conflicts and offline guest play

## 6. PWA and Offline

- `sw.js`: Service worker with cache strategies and offline behaviour
- `manifest.json`: Install metadata and icons
- `scripts/page-init.js`: Service worker registration and update prompt

Service worker v30 precaches Word Quest and public authentication assets. Private
APIs, `/.auth` and callback HTML/JS bypass caches. Guest play can work offline
after assets are cached. If identity cannot be verified on reload, Word Quest
opens the guest namespace; account-local progress remains stored for the next
verified sign-in. See [offline and recovery details](docs/word-quest-email-auth.md).

When adding new pages or assets that must work offline:

1. Add assets to service-worker cache lists.
2. Bump `CACHE_VERSION` in `sw.js`.
3. Re-test both online and offline behaviour.

## 7. Configuration Files

| File                              | Purpose                                               |
| --------------------------------- | ----------------------------------------------------- |
| `.nvmrc`                          | Node.js version (20)                                  |
| `.prettierrc.json`                | Prettier config (`printWidth: 100`, single quotes)    |
| `.eslintrc.cjs`                   | ESLint config with Prettier compatibility             |
| `.editorconfig`                   | Editor whitespace / encoding settings                 |
| `tsconfig.check.json`             | TypeScript checking config (no emit)                  |
| `jsconfig.json`                   | VS Code JavaScript project settings                   |
| `playwright.config.js`            | Playwright E2E configuration                          |
| `.husky/`                         | Git hooks (pre-commit: lint-staged)                   |
| `staticwebapp.config.json`        | Managed Node runtime and legacy entry redirects       |
| `api/local.settings.json.example` | Local API configuration template; no real credentials |

## 8. Documentation Governance

Documentation is intentionally scoped to active references:

- Keep technical truth in `README.md` and this file (`documentation.md`)
- Use `AGENTS.md` for contributor/agent coding guidelines
- Keep game-level behaviour and specs under `docs/*-spec.md`
- Keep the development log in `progress.md`
- Keep current authentication behavior in `docs/word-quest-email-auth.md` and
  deployment evidence/next steps in `docs/email-password-production-cutover.md`
- Retain superseded migration/probe plans only as clearly labelled historical
  evidence, linking readers to the active plan instead of leaving live-looking checklists

## 9. Deployment Notes

- GitHub Pages/other static hosts support local gameplay; they do not provide
  the Azure account/progress API.
- Dev deploys automatically from `dev` after reusable CI. Production uses
  `.github/workflows/azure-static-web-apps-production.yml`: manual dispatch from
  `main`, selected-commit ancestry/baseline checks, exact-commit CI, then the
  existing `production` environment approval. A main merge alone does not deploy Azure.
- Both Azure staging workflows build the ignored pinned MSAL SDK/license into
  the static artifact. The API deploys separately from `api/`. Older recovery
  commits without the auth build script skip SDK staging in production.
- Current release/configuration/acceptance and rollback instructions are in
  [the production cutover guide](docs/email-password-production-cutover.md).
- Validate service-worker updates whenever cached assets change
- Prefer runtime paths that work under sub-path hosting
