Original prompt: [$develop-web-game](/Users/onurerbey/.codex/skills/develop-web-game/SKILL.md) Please review conjugation sprint game. Find improvements for both gaming perspective and UI. You work should be done in a remote branch.

## 2026-02-24 - Implementation start

- Created branch `codex/conjugation-sprint-balanced-pass`.
- Starting focused Conjugation Sprint upgrade implementation with optional no-timer mode.
- Added `src/games/conjugation-sprint/logic.js` with form validation, prompt-pool builder, option generation fallback, pace-mode normalization, and score delta helper.
- Reworked `src/games/conjugation-sprint/index.js` to support validated prompt pools, robust options, timed/untimed pacing, keyboard shortcuts, and persisted best stats/pace mode.
- Updated `conjugation-sprint.html` with `paceMode`, `timer`, `best`, progress bar, and `feedback` elements.
- Refreshed `src/games/conjugation-sprint/styles.css` for timer states, feedback styling, progress visuals, and mobile readability.
- Added `test/games/conjugation-sprint/logic.test.js` for prompt filtering, option guarantees, and timed/untimed scoring.
- Updated `test/games/conjugation-sprint/index.test.js` for new required DOM ids.
- Expanded `e2e/smoke.spec.js` Conjugation Sprint smoke case to cover timed timeout behavior and untimed no-timeout behavior.
- Validation run: `npm test` passed (59 tests).
- Validation run: `npm run test:e2e -- e2e/smoke.spec.js -g "conjugation sprint"` passed.
- Validation run: `npm run lint` passed.

## TODO / Suggestions for next agent

- Consider adding a dedicated integration test for localStorage persistence of `preferredPaceMode` and best stats.
- Optionally add a compact mobile variant that collapses hero badges to expose more board area above the fold.

## 2026-02-24 - Full GUI redesign pass

- Rebuilt `conjugation-sprint.html` into a new "stage + mission HUD + question panel + accuracy matrix" layout while preserving all gameplay ids/hooks.
- Replaced `src/games/conjugation-sprint/styles.css` with a complete visual system refresh (new gradients, card hierarchy, control styling, responsive layout, and motion).
- Reformatted redesign files with `npx prettier --write conjugation-sprint.html src/games/conjugation-sprint/styles.css`.
- Re-ran checks after redesign: `npm test`, `npm run test:e2e -- e2e/smoke.spec.js -g "conjugation sprint"`, and `npm run lint` all passed.
- Captured visual QA screenshots (desktop + mobile) and adjusted stacked mobile order so the question panel appears above HUD when screen is narrow.

## 2026-02-24 - Follow-up fixes (dark mode + timed start)

- Set default pace mode to `untimed` and changed fallback persisted preference to `untimed`.
- Added `#startTimed` button for timed mode; timer now starts only after explicit click per round.
- Disabled answer/skip controls while timed round is waiting for `Start timer`.
- Added timer "ready" state and new UI classes for start-gated timed rounds.
- Improved dark-mode label readability for HUD meta labels (including ROUND PROGRESS).
- Updated Conjugation Sprint smoke test to validate start-gated timed flow.
- Added `startTimed` id assertion to HTML structure test.

## 2026-02-26 - Decl6 detective full rebuild start

- Current prompt: Recreate “Kas ir manā mājā? — 6th Declension Detective” from scratch because gameplay quality is unsatisfying.
- Audited existing implementation (`decl6-detective.html`, `src/games/decl6-detective/*`, `data/decl6-detective/items.json`, `docs/decl6-detective-spec.md`).
- Decision: replace current dual-mode card flow with a new single-board detective loop and deterministic test hooks (`render_game_to_text`, `advanceTime`).
- Verified no existing e2e test directly covers gameplay for `decl6-detective`, so a new smoke path should be added after rewrite.

- Replaced `decl6-detective.html` from scratch with a new canvas-first detective stage + dossier UI.
- Replaced `src/games/decl6-detective/index.js` with a new gameplay loop: room investigation, answer lock/unlock flow, hearts/timer pressure, scoring/streak system, and restart/victory/gameover states.
- Added deterministic automation hooks: `window.render_game_to_text` (includes room coordinates + clue state) and `window.advanceTime(ms)`.
- Re-themed `src/games/decl6-detective/styles.css` for the new layout and mobile/fullscreen behavior.
- Added smoke coverage in `e2e/smoke.spec.js` for starting the detective game, solving one clue, and advancing to the next case.
- Playwright skill loop run with `$WEB_GAME_CLIENT` + temporary local server on port `4173`.
- Fixed web-game client blocker: removed `frame-ancestors` from page-level meta CSP to stop console error spam that halted iteration captures.
- Fixed automation instability: switched menu loop to stop rewriting timer text every frame when not in `playing` mode.
- Adjusted canvas status banner so non-playing modes render explicit status (`menu` / `gameover` / `victory`).
- Captured and reviewed canvas screenshots + state dumps under:
  - `output/web-game/decl6-pass4/`
  - `output/web-game/decl6-pass5/`
- Added robust e2e solve logic to avoid ambiguous text matches (`valsts` vs `valsts (pl.)`).

## 2026-02-26 - Validation summary

- `npm run test:e2e -- e2e/smoke.spec.js -g "decl6 detective"` ✅
- `npm test` ✅ (59/59)
- `npm run lint` ✅

## TODO / Suggestions for next agent

- Investigate why Playwright reports `#decl6-start` as unstable for direct mouse click and consider removing that fragility (keyboard start already works reliably).
- Consider adding one more e2e assertion that validates hearts/time penalties after wrong-room investigation.
- Optional UX improvement: add an explicit focus outline/state in the dossier options for keyboard-only learners.

## 2026-02-26 - Decl6 instructions added

- Added a dedicated in-game `Kā spēlēt / How to play` instructions block in the dossier (`decl6-detective.html`).
- Instructions now explain full round flow: start, room navigation, investigation, answer selection, penalties, and win condition.
- Added styles for a readable collapsible instruction panel in `src/games/decl6-detective/styles.css`.
- Validation: `npm run test:e2e -- e2e/smoke.spec.js -g "decl6 detective"` passed.

## 2026-05-02 - Word Quest prefixed nākt world

- Current prompt: Create another Word Quest style matching exercise for pienākt, nonākt, nākt, sanākt, pārnākt, atnākt, and pienākties.
- Audited Word Quest world definitions and battle flow in `src/games/word-quest/main.js`.
- Plan: add a sixth data-driven Word Quest world using `data/latvian_prefixed_verb_exercise.spec.json`, generating meaning-match battle prompts from `target_words`.
- Added `Coming Verb Quest` to Word Quest with 7 nodes and meaning-match battles generated from the prefixed verb spec JSON.
- Updated Word Quest copy from 5 to 6 worlds and added automation hooks (`render_game_to_text`, `advanceTime`) for state inspection.
- Fixed the Word Quest Bootstrap bundle SRI typo caught by the web-game client.
- Added e2e coverage for the sixth world and answering a prefixed-coming meaning challenge.
- Validation: `npm run lint`, focused Word Quest Playwright tests, web-game client pass, `npm test`, and full `npm run test:e2e` passed.
- Visual QA artifacts: `output/web-game/word-quest-prefixed-coming-pass2/map-screen.png` and `output/web-game/word-quest-prefixed-coming-pass2/battle-screen.png`.

## 2026-05-10 - Similar word groups exercise

- Current prompt: Create a totally new exercise from grouped Latvian words such as `atzīmēta`, `piezīmēta`, `pārzīmēta`, `rādīta`, `radīta`, and `parādīta`.
- Added standalone data-driven exercise page `similar-word-groups.html` with 11 groups and 33 word-choice tasks.
- Added `data/similar-word-groups.json`, `src/games/similar-word-groups/logic.js`, `index.js`, and `styles.css`.
- Wired the exercise into the homepage catalogue, nav, service worker cache, homepage counts, and smoke/e2e tests.
- Validation: `npm test`, `npm run lint`, `npm run typecheck`, `npm run validate:data`, `npm run validate:i18n`, `npm run test:e2e -- e2e/game-pages.spec.js`, and focused homepage smoke passed.
- Follow-up: restyled the exercise to use the shared `--dp-*` blue/teal palette in light and dark modes, removed the outdated warm brown/ruby accents, and added dark-theme e2e coverage.

## 2026-07-11 - Form Factory v3 independent UI redesign

- Current prompt: replace the v2-like Form Factory v3 interface with a genuinely new, modern mobile-first UI.
- Audited v2 and v3 and identified the shared card, chip, HUD, and stacked-answer composition as the main source of similarity.
- Rebuilt v3 around an industrial morphology workbench: assembly-line deck selector, full-screen round console, segmented production progress, 2x2 ending keyboard, integrated feedback strip, and score-poster summary.
- Split answer keys into visible stem and ending parts while retaining complete accessible names.
- Added Enter-to-advance behavior after feedback and updated the focused browser smoke test.
- Fixed inherited body scrolling, hid the oversized shared footer link list on phones, and bumped the offline cache to `v23`.
- Preserved the data model, progress storage, DOM test hooks, and 12-question round behavior.
- Visual QA completed for 390x844 light/dark start, play, feedback, and summary states plus desktop gameplay; no horizontal overflow or console errors found.
- Validation passed: `npm test` (98 tests), `npm run lint`, `npm run typecheck`, `npm run format:check`, focused Form Factory v3 Playwright smoke, and the required web-game client loop.

## TODO / Suggestions for next agent

- No known follow-up items from this redesign pass.

## 2026-07-31 - Sentence Surgery focused repair redesign

- Current prompt: implement the approved mobile-first Sentence Surgery focused-repair plan with instant grading, settings/review flows, LV/EN/RU localization, accessible feedback, modular game logic, and full validation.
- Preserving the existing page URL, 52-item dataset, saved completion statistics, and unrelated worktree changes.
- Implementation started with separate workstreams for the page shell/styles, pure game logic/progress, and localization before controller integration.
- Added a Sentence Surgery JSON Schema and semantic `validate:data` checks for unique IDs, exactly one token mismatch, matching declared error tokens, and an exact-target word-bank option.
- Validation checkpoint: `npm run validate:data` passes with the new schema and semantic checks.
- Integrated the modular controller and DOM renderer; focused Sentence Surgery unit/structure/i18n tests pass under the repository jsdom setup.
- First required web-game-client capture matched `render_game_to_text`; removed the ineffective `frame-ancestors` meta directive after Chromium reported it as a console error (framing protection must be an HTTP response header).
- Replaced irrelevant agreement distractors with generated gender/number forms from the exact participle stem; runtime questions now offer only the intended grammar contrast.
- Added DOM coverage for the single prose sentence, one repair slot, delayed English translation, localized labels, wrong-choice focus preservation, and success-to-Next focus.
- Focused Playwright coverage now passes for keyboard-only wrong/correct/Next play, one attempt per activation, language persistence, review-completed, reset confirmation, 320/375px layout, desktop centering, light/dark contrast, reduced motion, and overflow.
- Mobile solved-state QA exposed and fixed a nested-scroll trap caused by the shared `height: 100%` body rule; feedback and Next are now reachable and were visually rechecked at 375×667.
- Full Playwright initially exposed one unrelated stale Form Factory smoke selector (`fx-*` versus the checked-in `ff-*` shell); updated selectors only, then confirmed the complete 25-test browser suite passes.
- Final validation: `npm test` (148/148), `npm run typecheck`, `npm run lint`, `npm run validate:data`, `npm run validate:i18n`, targeted Prettier checks, focused Sentence Surgery Playwright (3/3), required web-game-client state/screenshots, and full `npm run test:e2e` (25/25) all pass.
- Removed one stale nonexistent LV–RU file from the service worker’s all-or-nothing precache; all 131 remaining `CORE_ASSETS` paths now resolve, including the new Sentence Surgery modules and locale catalogs.

## TODO / Suggestions for next agent

- No known Sentence Surgery follow-up items.

## 2026-07-11 - Form Factory v3 dark mode and PC usability follow-up

- Current prompt: improve difficult dark-mode usage and review the PC layout.
- Root cause: `--ffv3-ink` and `--ffv3-paper` represented both text and structural surfaces, causing the console and keyboard bay to invert in dark mode.
- Split the visual system into canvas, surface, stage, text, muted text, line, console, console text, option, and navigation roles.
- Kept the run bar and answer bay consistently dark in both themes while giving dark mode readable stage and key surfaces.
- Moved the side-by-side workbench to a true desktop breakpoint and rebalanced it around a wider, vertically centered reading stage and centered ending keyboard.
- Removed the desktop workbench minimum height after visual QA showed it pushed the feedback strip below the viewport.
- Added Playwright coverage for dark-mode text contrast, desktop pane geometry, horizontal overflow, and feedback visibility within the viewport.
- Visual QA completed at 390x844 and 1440x900 for dark start, play, and feedback states; light desktop gameplay was also rechecked with the web-game client.
- Validation passed: `npm test` (98 tests), `npm run lint`, `npm run typecheck`, `npm run format:check`, focused Form Factory v3 Playwright tests, and the required web-game client loop.

## TODO / Suggestions for next agent

- No known follow-up items from this dark-mode and desktop pass.

## 2026-07-31 - Form Factory v3 adaptive ladder

- Current prompt: Apply the Darbības Vārdi V2 exercise logic and matching UI to Form Factory V3.
- Preserved the existing Form Factory v3 deck filters and data source while replacing the one-stage random cloze loop with per-item Leitner records.
- Added three automatic stages: ending-rule recognition, contextual cloze recognition, and typed full-form production.
- Added due-first round selection, a four-new-item cap, immediate one-time retries, persisted XP/mastery, and deck health summaries.
- Rebuilt the start, play, feedback, and summary layouts around the Darbības Vārdi V2 information architecture while retaining Form Factory terminology.
- Added unit coverage for record promotion/reset, adaptive ordering, deck summaries, all three task shapes, and stage-based XP; focused unit suite passes (11/11).
- Added focused browser coverage for rule, cloze, typed build, dark desktop contrast, feedback positioning, and 390px mobile fit; all 5 focused tests pass.
- Ran the required web-game client and visually inspected start, play, and feedback screenshots plus matching `render_game_to_text` state; hid the footer during play after the first feedback capture exposed an overlap.
- Final validation: full unit suite 121/121, lint, typecheck, data validation, i18n validation, focused Form Factory e2e, and all game-page e2e tests pass.
- Repository-wide `format:check` remains blocked by six pre-existing unformatted Darbības Vārdi V2 / Endings Builder files; all files changed for this task pass a targeted Prettier check.

## TODO / Suggestions for next agent

- No known Form Factory v3 follow-up items.

## 2026-07-31 - Endings Builder V2-style UI redesign

- Current prompt: make the Endings Builder exercise UI similar to Darbības Vārdi V2.
- Reframed the page into separate start and play screens using the V2 visual hierarchy and palette.
- Added a welcome overview, three-step training explanation, strict-mode setting, compact sticky HUD, focused task card, and bottom action sheet.
- Preserved ending drag/click selection, full-form typing, Latvian keypad, rule table, strict matching, score, streak, accuracy, and reporting.
- Added `render_game_to_text` and `advanceTime` browser automation hooks.
- Visual QA covered desktop start/play, 390px mobile play/feedback, and settled dark mode with no horizontal overflow or console errors.
- Fixed two issues found during QA: retained start-screen scroll and a transformed containing block that displaced the fixed action sheet.
- Fixed a stale wrong-answer timeout that could overwrite a rapid correct selection.
- Validation passed: full unit suite (121/121), lint, typecheck, targeted formatting, focused Playwright smoke, and the required web-game client loop.

## TODO / Suggestions for next agent

- No known follow-up items from this redesign pass.
