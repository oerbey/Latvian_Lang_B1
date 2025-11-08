# Repository Guidelines

## Project Structure & Module Organization
- `src/` hosts interactive page logic (e.g., `games/conjugation-sprint/index.js`) written in modern ES modules, with shared helpers in `src/lib/`. Keep new gameplay code here.
- `data/` stores verb data in JSON plus offline fallbacks; treat generated files like `words.offline.js` as build artifacts.
- `scripts/` contains Node and Python utilities for regenerating datasets; favor these over editing JSON by hand.
- `assets/`, `styles.css`, and the top-level `.html` files drive the static UI served by GitHub Pages. Place shared UI helpers in `scripts/page-init.js`.
- `test/` mirrors `src/` structure for Node’s test runner.

## Build, Test, and Development Commands
- `npm run build:data` converts the spreadsheet input to JSON via `scripts/xlsx_to_json.mjs`.
- `npm run build:offline` refreshes offline study packs in `docs/` using Python.
- `npm test` runs Node’s built-in test runner across `test/`.
- `npm run lint` executes ESLint with Prettier compatibility; fix warnings before opening a PR.

## Coding Style & Naming Conventions
- Use ES modules with top-level `const`/`let`; prefer pure helpers near their usage.
- Favor descriptive camelCase for variables and functions (`tenseMode`, `buildChoiceButtons`).
- Keep UI text in Latvian/English strings close to components or in `i18n/` when shared.
- Format files with `prettier --write` (no repo script yet); match existing two-space indentation.

## Testing Guidelines
- Add Node test files under `test/` mirroring the source tree (e.g., `games/conjugation-sprint/index.test.js`), keeping the `.test.js` suffix.
- Stub DOM APIs with `node:test` + `jsdom` when needed; keep fixtures minimal.
- Target parity with changed functionality and cover edge cases (empty data, random branches).

## Commit & Pull Request Guidelines
- Follow the existing concise style: imperative subject line (`Add tense selector to Conjugation Sprint`) and optional body for context.
- Push feature branches (`feature/<topic>`) and open PRs that summarize the change, include repro steps, and link related issues or cards.
- Attach screenshots or screen recordings for UI adjustments when feasible; mention any manual testing performed.

## Agent Workflow Tips
- After switching branches via the Codex CLI, rerun `git status` to confirm sandbox sync.
- Avoid editing generated files without running their companion scripts; note regeneration commands in commit bodies when applicable.
