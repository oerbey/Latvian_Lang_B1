# Latvian Language B Games

A static, browser-first collection of Latvian B-level learning games and drills.

The project is built with vanilla ES modules, ships as a Progressive Web App
(PWA), and runs without a bundler.

See [CHANGELOG.md](CHANGELOG.md) for notable changes and release history recorded
from September 2026 onward.

## Highlights

- **16 game pages** covering verbs, grammar, sentence repair, vocabulary,
  and character-trait practice
- PWA support with service-worker caching and offline fallbacks
- Latvian / English / Russian UI translations (`i18n/`)
- Mobile-friendly responsive layouts with keyboard and screen-reader support
- Canvas-based core modes (Match & Forge) on the home page
- Data build pipeline for generated JSON artifacts
- Comprehensive CI: lint, format, typecheck, unit tests, data/i18n
  validation, and Playwright E2E

## Word Quest accounts and cloud saves

Word Quest supports hosted email/password accounts through Microsoft Entra
External ID on Azure Static Web Apps Free hosting. Guests play locally; signed-in
progress is kept separate per account and can restore across browsers. Other
games retain their existing local progress. Microsoft social login, account
linking and progress migration are outside this release.

**Release status, verified 2026-10-15:** Dev acceptance is complete. PR #211 is
merged into `main` at `7726f787768b3975c04be3a0692222218f64751e`, with passing CI.
Production identity configuration is prepared, but the manual Azure production
release and its acceptance tests remain pending. A GitHub Pages deployment does
not deploy the Azure API or complete that release.

- [Integration and offline behavior](docs/word-quest-email-auth.md)
- [Production configuration, release and recovery](docs/email-password-production-cutover.md)
- [Implementation plan and acceptance history](docs/email-password-authentication-plan.md)

## Game Entry Points

| Page                               | Focus                                                  |
| ---------------------------------- | ------------------------------------------------------ |
| `index.html`                       | Homepage — game-card grid + canvas Match & Forge modes |
| `darbibas-vards.html`              | Verb matching (design-plan prototype)                  |
| `conjugation-sprint.html`          | Conjugation speed rounds (timed / untimed)             |
| `endings-builder.html`             | Morphology / endings drag-and-drop                     |
| `passive-lab.html`                 | Passive voice building                                 |
| `sentence-surgery-passive.html`    | Passive sentence repair                                |
| `decl6-detective.html`             | 6th declension detective — canvas investigation        |
| `travel-tracker.html`              | Route / prefix practice on a Latvia map                |
| `maini-vai-mainies.html`           | Reflexive vs non-reflexive verbs                       |
| `duty-dispatcher.html`             | Debitive / dative role assignment (drag-and-drop)      |
| `rakstura-ipasibas-match.html`     | Character-trait matching                               |
| `rakstura-ipasibas-expansion.html` | Expanded character-trait matching                      |
| `character-traits.html`            | Character-trait free practice                          |
| `english-latvian-arcade.html`      | EN → LV Word Catcher arcade                            |
| `word-quest.html`                  | RPG-style grammar adventure                            |
| `week1.html`                       | Offline-friendly prefix movement vocabulary module     |

### Concept / Prototype Pages

| Page                              | Notes                                        |
| --------------------------------- | -------------------------------------------- |
| `word-quest-landing-concept.html` | Standalone UI concept for Word Quest landing |
| `design-plan/`                    | Early design prototypes (HTML + CSS + JS)    |

## Quick Start

Requires **Node.js 20** (see `.nvmrc`).

```bash
npm ci
npm ci --prefix api
npm run start
```

Open [http://localhost:5173](http://localhost:5173).

Startup builds the pinned public authentication SDK into ignored
`assets/vendor/msal-browser/`. The static server supports local guest play; it
does not host `/api/*` or provide working cloud sign-in. API development needs
the managed Functions runtime/settings described in
[the architecture guide](documentation.md#25-word-quest-authentication-and-progress).
Interactive localhost sign-in also needs an explicitly registered Dev callback;
automated browser tests use synthetic authentication instead.

## Development Commands

| Command                     | Description                                   |
| --------------------------- | --------------------------------------------- |
| `npm run start`             | Serve locally on port 5173                    |
| `npm test`                  | Run Node.js unit tests                        |
| `npm test --prefix api`     | Run API authentication and progress tests     |
| `npm run build:auth-client` | Stage the pinned public MSAL SDK and license  |
| `npm run verify:cloud:dev`  | Check Dev API health and anonymous rejection  |
| `npm run test:watch`        | Unit tests in watch mode                      |
| `npm run test:coverage`     | Unit tests with coverage                      |
| `npm run test:e2e`          | Playwright E2E smoke tests (Chromium)         |
| `npm run lint`              | ESLint (with Prettier compat)                 |
| `npm run format`            | Apply Prettier formatting                     |
| `npm run format:check`      | Check Prettier formatting (CI)                |
| `npm run typecheck`         | TypeScript checking via `tsconfig.check.json` |
| `npm run validate:data`     | Validate JSON datasets against schemas        |
| `npm run validate:i18n`     | Check locale files for key parity             |

## Data Build Pipeline

Source-first workflow — edit canonical source files (`.xlsx` / `.csv` /
JSON), then regenerate artifacts with scripts. Do **not** hand-edit
generated output.

| Command                      | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `npm run build:data`         | Convert spreadsheet → `data/words.json`        |
| `npm run build:words:chunks` | Split into `data/words/index.json` + chunks    |
| `npm run build:personality`  | Rebuild `data/personality/words.json` from CSV |
| `npm run build:offline`      | Refresh offline bundles                        |
| `npm run build:all`          | Run the full pipeline above                    |

Generated files:

- `data/words.json`
- `data/words/index.json` and `data/words/chunk-*.json`
- `data/personality/words.json`
- `data/words.offline.js`, `data/week1.offline.js`,
  `data/endings-builder/offline.js`, `i18n/offline.js`

## Testing and CI

Run these locally before opening a PR:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm test --prefix api
npm run validate:data
npm run validate:i18n
npm run test:e2e
```

GitHub Actions CI (`.github/workflows/test.yml`) runs three jobs:

1. **Quality + Unit** — lint, format check, typecheck, coverage,
   data/i18n validation
2. **API Quality + Unit** — API authentication, validation, ownership and storage tests
3. **E2E (Playwright)** — Chromium smoke and authentication tests after both unit jobs, with failure artifact
   upload

CI features: concurrency cancellation per ref, least-privilege
permissions (`contents: read`), dependency + Playwright browser caching.

## Documentation Map

| File                                         | Purpose                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `README.md`                                  | This file — project overview and quick start                      |
| `documentation.md`                           | Technical architecture and maintenance guide                      |
| `AGENTS.md`                                  | Repository guidelines for contributors and AI agents              |
| `progress.md`                                | Development log and change history                                |
| `docs/*-spec.md`                             | Game-level specification / design documents                       |
| `docs/word-quest-email-auth.md`              | Current authentication, progress and offline behavior             |
| `docs/email-password-production-cutover.md`  | Verified environment setup and manual production release/recovery |
| `docs/email-password-authentication-plan.md` | Current release scope and implementation/acceptance history       |

The earlier multi-provider plan, migration bridge guide and Dev probe record
are historical references. Their old deployment instructions are superseded.

## Stack

- **Runtime**: Vanilla JavaScript ES modules — no bundler
- **UI**: Bootstrap 5.3 (CDN), HTML5 Canvas for select games
- **Node.js 20** (`.nvmrc`) — tooling, test runner, build scripts
- **Testing**: Node built-in test runner + Playwright E2E
- **Quality**: ESLint + Prettier (`printWidth: 100`) + TypeScript checks
- **PWA**: Service worker (`sw.js`) + `manifest.json`
- **Cloud progress**: Azure managed Node 20 Functions + Cosmos DB; Entra External ID + MSAL
- **Data**: JSON schemas (`schemas/`), XLSX/CSV sources, offline JS bundles

## Contribution Notes

- Keep branch work on feature branches
- Use imperative commit messages
- Avoid editing generated artifacts directly — run build scripts instead
- Include screenshots for user-facing UI changes when practical
- See `AGENTS.md` for detailed coding style, commenting, and testing
  guidelines
