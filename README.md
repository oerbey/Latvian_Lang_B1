# Latvian Language B1 Games

A static, browser-first collection of Latvian B1 learning games and drills.

The project is built with vanilla ES modules, ships as a Progressive Web App
(PWA), and runs without a bundler.

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
| `week1.html`                       | Offline-friendly Week 1 vocabulary module              |

### Concept / Prototype Pages

| Page                              | Notes                                        |
| --------------------------------- | -------------------------------------------- |
| `word-quest-landing-concept.html` | Standalone UI concept for Word Quest landing |
| `design-plan/`                    | Early design prototypes (HTML + CSS + JS)    |

## Quick Start

Requires **Node.js 20** (see `.nvmrc`).

```bash
npm install
npm run start
```

Open [http://localhost:5173](http://localhost:5173).

## Development Commands

| Command                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| `npm run start`         | Serve locally on port 5173                    |
| `npm test`              | Run Node.js unit tests                        |
| `npm run test:watch`    | Unit tests in watch mode                      |
| `npm run test:coverage` | Unit tests with coverage                      |
| `npm run test:e2e`      | Playwright E2E smoke tests (Chromium)         |
| `npm run lint`          | ESLint (with Prettier compat)                 |
| `npm run format`        | Apply Prettier formatting                     |
| `npm run format:check`  | Check Prettier formatting (CI)                |
| `npm run typecheck`     | TypeScript checking via `tsconfig.check.json` |
| `npm run validate:data` | Validate JSON datasets against schemas        |
| `npm run validate:i18n` | Check locale files for key parity             |

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
npm run validate:data
npm run validate:i18n
npm run test:e2e
```

GitHub Actions CI (`.github/workflows/test.yml`) runs two jobs:

1. **Quality + Unit** — lint, format check, typecheck, coverage,
   data/i18n validation
2. **E2E (Playwright)** — Chromium smoke tests with failure artifact
   upload

CI features: concurrency cancellation per ref, least-privilege
permissions (`contents: read`), dependency + Playwright browser caching.

## Documentation Map

| File               | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `README.md`        | This file — project overview and quick start         |
| `documentation.md` | Technical architecture and maintenance guide         |
| `AGENTS.md`        | Repository guidelines for contributors and AI agents |
| `progress.md`      | Development log and change history                   |
| `docs/*-spec.md`   | Game-level specification / design documents          |

## Stack

- **Runtime**: Vanilla JavaScript ES modules — no bundler
- **UI**: Bootstrap 5.3 (CDN), HTML5 Canvas for select games
- **Node.js 20** (`.nvmrc`) — tooling, test runner, build scripts
- **Testing**: Node built-in test runner + Playwright E2E
- **Quality**: ESLint + Prettier (`printWidth: 100`) + TypeScript checks
- **PWA**: Service worker (`sw.js`) + `manifest.json`
- **Data**: JSON schemas (`schemas/`), XLSX/CSV sources, offline JS bundles

## Contribution Notes

- Keep branch work on feature branches
- Use imperative commit messages
- Avoid editing generated artifacts directly — run build scripts instead
- Include screenshots for user-facing UI changes when practical
- See `AGENTS.md` for detailed coding style, commenting, and testing
  guidelines
