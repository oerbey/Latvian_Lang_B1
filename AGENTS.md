# Repository Guidelines

## Project Structure & Module Organization

- `src/` hosts interactive page logic (e.g., `games/conjugation-sprint/index.js`) written in modern ES modules, with shared helpers in `src/lib/` (24 modules). Keep new gameplay code here.
- `data/` stores game data in JSON plus offline fallbacks; treat generated files like `words.offline.js` as build artifacts.
- `data/personality/` uses a CSV source (`words.csv`) plus generated runtime JSON (`words.json`); regenerate via scripts instead of hand-editing output.
- `data/lv-en/` and `data/lv-ru/` hold Latvian-English and Latvian-Russian forge/unit data for the canvas modes.
- `schemas/` contains JSON validation schemas for datasets (`words`, `duty-dispatcher`, `maini-vai-mainies`, `travel-tracker`).
- `scripts/` contains Node build and validation utilities; favor these over editing JSON by hand.
- `assets/` holds static assets (icons, game images, preview images). `styles.css` and the top-level `.html` files (16 game pages) drive the static UI served by GitHub Pages.
- `test/` mirrors `src/` structure for Node's built-in test runner (`.test.js` suffix).
- `e2e/` contains Playwright smoke tests (`smoke.spec.js`, `game-pages.spec.js`), configured by `playwright.config.js`.

## Build, Test, and Development Commands

- `npm run start` serves the site locally on port `5173` via `http-server`.
- `npm run build:data` converts the spreadsheet input to JSON via `scripts/xlsx_to_json.mjs`.
- `npm run build:words:chunks` splits `data/words.json` into `data/words/index.json` + chunk files via `scripts/split-words-json.mjs`.
- `npm run build:personality` rebuilds personality vocabulary JSON from `data/personality/words.csv` via `scripts/personality_csv_to_json.mjs`.
- `npm run build:offline` refreshes offline bundles (`i18n/offline.js`, `data/week1.offline.js`, `data/endings-builder/offline.js`) via `scripts/build_week1_offline.mjs`.
- `npm run build:all` runs the full data build pipeline (`build:data`, `build:words:chunks`, `build:personality`, `build:offline`).
- `npm run validate:data` checks JSON datasets against schemas in `schemas/` (including word chunk totals).
- `npm run validate:i18n` checks locale files (`i18n/lv.json`, `i18n/en.json`, `i18n/ru.json`) for key parity.
- `npm test` runs Node's built-in test runner across `test/`.
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
- Format files with `npm run format`; Prettier is configured with `printWidth: 100`, single quotes, trailing commas (see `.prettierrc.json`).
- Match existing two-space indentation.

## Commenting Standards

- Prefer self-explanatory code first; add comments only when intent, constraints, or tradeoffs are not obvious from names and structure.
- Write comments that explain `why` and `when`, not line-by-line `what` the code is doing.
- Keep comments short and specific (1-2 lines in most cases), placed directly above the logic they describe.
- Add function-level docs for exported helpers when inputs/outputs, fallback behavior, or side effects are non-trivial.
- Document edge cases and invariants near the branch/check that enforces them (for example fallback precedence, deterministic shuffle rules, strict-vs-lenient parsing).
- When adding TODO/FIXME notes, include enough context to be actionable and searchable (for example `TODO(data): ...`).
- Remove or update comments in the same change when behavior changes; stale comments are treated as bugs.
- Do not leave commented-out code in committed files; rely on Git history instead.
- Keep generated files comment-free unless the generator inserts them; add rationale in source scripts, not generated output.

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
- Before opening a PR, align with CI by running `npm test`, `npm run validate:data`, `npm run validate:i18n`, and `npm run test:e2e`.
- Reference `README.md` for a quick project overview, `documentation.md` for architecture details, and `docs/*-spec.md` for game-specific designs.
- Node.js 20 is required (see `.nvmrc`).
