# Latvian Language B1 Games

A static, browser-first collection of Latvian B1 learning games and drills.

The project is built with vanilla ES modules, ships as a Progressive Web App, and runs without a bundler.

## Highlights

- Multiple focused games for verbs, grammar, sentence repair, and vocabulary recall
- PWA support with service-worker caching and offline fallbacks
- Latvian / English / Russian UI translations
- Mobile-friendly pages with keyboard and screen-reader support
- Data build pipeline for generated JSON artifacts

## Game Entry Points

| Page                               | Focus                                   |
| ---------------------------------- | --------------------------------------- |
| `index.html`                       | Home + main canvas modes (Match, Forge) |
| `darbibas-vards.html`              | Verb matching                           |
| `conjugation-sprint.html`          | Conjugation speed rounds                |
| `endings-builder.html`             | Morphology / endings drag-and-drop      |
| `passive-lab.html`                 | Passive voice building                  |
| `sentence-surgery-passive.html`    | Passive sentence repair                 |
| `decl6-detective.html`             | 6th declension detective                |
| `travel-tracker.html`              | Route/prefix practice                   |
| `maini-vai-mainies.html`           | Reflexive vs non-reflexive verbs        |
| `duty-dispatcher.html`             | Debitive/dative role assignment         |
| `rakstura-ipasibas-match.html`     | Character-trait matching                |
| `rakstura-ipasibas-expansion.html` | Expanded trait matching                 |
| `character-traits.html`            | Character-trait practice                |
| `english-latvian-arcade.html`      | EN -> LV Word Catcher                   |
| `word-quest.html`                  | RPG-style grammar adventure             |
| `week1.html`                       | Offline-friendly week module            |

## Quick Start

```bash
npm install
npm run start
```

Open [http://localhost:5173](http://localhost:5173).

## Development Commands

```bash
npm run start
npm test
npm run test:watch
npm run test:coverage
npm run test:e2e
npm run lint
npm run format
npm run format:check
npm run typecheck
npm run validate:data
npm run validate:i18n
```

## Data Build Pipeline

Source-first workflow:

- Edit the canonical source files (`.xlsx` / `.csv` / JSON inputs)
- Regenerate artifacts with scripts (do not hand-edit generated output)

```bash
npm run build:data
npm run build:words:chunks
npm run build:personality
npm run build:offline
npm run build:all
```

Generated files include:

- `data/words.json`
- `data/words/index.json` and `data/words/chunk-*.json`
- `data/personality/words.json`
- `data/words.offline.js`, `data/week1.offline.js`, `data/endings-builder/offline.js`, `i18n/offline.js`

## Testing and CI

Local expectations before PRs:

```bash
npm run lint
npm test
npm run validate:data
npm run validate:i18n
npm run test:e2e
```

GitHub Actions CI (`.github/workflows/test.yml`) runs:

- Quality + unit checks: lint, format check, typecheck, coverage, data/i18n validation
- Playwright E2E smoke tests (Chromium)

## Documentation Map

- `documentation.md`: technical architecture and maintenance guide
- `docs/*-spec.md`: feature/game specification docs
- `docs/endings-builder-analysis/*`: deep-dive analysis docs
- `docs/priority-a/*`: forward roadmap and issue backlog
- `ideas/architectural-review-2026/*`: long-form architecture review notes

## Concept Design Sandbox

A separate modern UI concept is available at:

- `concept/modern-home.html`

This is intentionally isolated and not wired into navbar/home routing, so it can be removed safely without affecting production pages.

## Stack

- Vanilla JavaScript ES modules
- Bootstrap 5 (CDN)
- Node.js tooling + Node test runner
- Playwright for smoke E2E
- ESLint + Prettier + TypeScript checks (via `tsconfig.check.json`)

## Contribution Notes

- Keep branch work on feature branches
- Use imperative commit messages
- Avoid editing generated artifacts directly
- Include screenshots for user-facing UI changes when practical
