# Repository Guidelines

## Project Structure & Module Organization

- `src/` hosts interactive page logic (e.g., `games/conjugation-sprint/index.js`) written in modern ES modules, with shared helpers in `src/lib/`. Keep new gameplay code here.
- `data/` stores verb data in JSON plus offline fallbacks; treat generated files like `words.offline.js` as build artifacts.
- `data/personality/` uses a CSV source (`words.csv`) plus generated runtime JSON (`words.json`); regenerate via scripts instead of hand-editing output.
- `scripts/` contains Node and Python utilities for regenerating datasets; favor these over editing JSON by hand.
- `assets/`, `styles.css`, and the top-level `.html` files drive the static UI served by GitHub Pages. Place shared UI helpers in `scripts/page-init.js`.
- `test/` mirrors `src/` structure for Node’s test runner.
- `e2e/` contains Playwright smoke tests, configured by `playwright.config.js`.

## Build, Test, and Development Commands

- `npm run start` serves the site locally on port `5173` for manual checks.
- `npm run build:data` converts the spreadsheet input to JSON via `scripts/xlsx_to_json.mjs`.
- `npm run build:words:chunks` splits `data/words.json` into `data/words/index.json` + chunk files.
- `npm run build:personality` rebuilds personality vocabulary JSON from `data/personality/words.csv`.
- `npm run build:offline` refreshes offline bundles (`i18n/offline.js`, `data/week1.offline.js`, `data/endings-builder/offline.js`) via `scripts/build_week1_offline.mjs`.
- `npm run build:all` runs the full data build pipeline (`build:data`, `build:words:chunks`, `build:personality`, `build:offline`).
- `npm run validate:data` checks JSON datasets against schemas (including word chunk totals).
- `npm run validate:i18n` checks locale files for key parity.
- `npm test` runs Node’s built-in test runner across `test/`.
- `npm run test:watch` reruns Node tests in watch mode during active development.
- `npm run test:coverage` runs Node tests with coverage enabled.
- `npm run test:e2e` runs Playwright smoke tests from `e2e/` (uses a temporary local `http-server` on port `4173`).
- `npm run typecheck` runs TypeScript checking via `tsconfig.check.json`.
- `npm run lint` executes ESLint with Prettier compatibility; fix warnings before opening a PR.
- `npm run format` applies Prettier formatting (use `npm run format:check` in CI).

## Coding Style & Naming Conventions

- Use ES modules with top-level `const`/`let`; prefer pure helpers near their usage.
- Favor descriptive camelCase for variables and functions (`tenseMode`, `buildChoiceButtons`).
- Keep UI text in Latvian/English strings close to components or in `i18n/` when shared.
- Format files with `npm run format`; match existing two-space indentation.

## Testing Guidelines

- Add Node test files under `test/` mirroring the source tree (e.g., `games/conjugation-sprint/index.test.js`), keeping the `.test.js` suffix.
- Stub DOM APIs with `node:test` + `jsdom` when needed; keep fixtures minimal.
- Target parity with changed functionality and cover edge cases (empty data, random branches).
- Add browser smoke coverage in `e2e/*.spec.js` for user-visible flows that changed.
- Keep Playwright specs deterministic and fast; rely on the configured `webServer` instead of launching custom servers in tests.
- First-time Playwright setup may require `npx playwright install --with-deps chromium`.

## Commit & Pull Request Guidelines

- Follow the existing concise style: imperative subject line (`Add tense selector to Conjugation Sprint`) and optional body for context.
- Push feature branches (`feature/<topic>`) and open PRs that summarize the change, include repro steps, and link related issues or cards.
- Attach screenshots or screen recordings for UI adjustments when feasible; mention any manual testing performed.

## Agent Workflow Tips

- After switching branches via the Codex CLI, rerun `git status` to confirm sandbox sync.
- Avoid editing generated files without running their companion scripts; note regeneration commands in commit bodies when applicable.
- Before opening a PR, align with CI by running `npm test`, `npm run validate:data`, and `npm run test:e2e`.
