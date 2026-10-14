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

## 2026-09-14 - Dev Azure deployment E2E contrast stabilization

- Current prompt: unblock the dev-only Azure sync deployment after the Sentence Surgery contrast check failed in GitHub Actions; production remains untouched.
- Reproduced the focused test ten times locally in CI mode without failure, confirming runner-dependent behavior rather than a consistent visual regression.
- Diagnostics captured the actual failing colors: the document reported dark mode while the sentence and repair text still used light-theme tokens.
- Root cause: the theme controller updated `<html>`, but shared game-theme dark palettes are selected by a `data-bs-theme` attribute on `<body>`.
- Updated the controller to keep theme attributes synchronized on both elements, and updated the test to switch through the real theme control and assert both elements.
- A full-suite run showed that Chromium can expose the new attributes before inherited color tokens finish recalculating under load, so the check now waits for the expected computed sentence color before measuring contrast.
- Added format-aware color conversion for `rgb()` and `color(srgb)` plus a browser fallback for other supported CSS color syntaxes.

## 2026-09-15 - Dev-only production-readiness identity metadata

- Current prompt: prepare the accepted Microsoft-only Azure sync implementation
  for a future production release while the owner retains control of the merge.
- Production remains untouched; all code work is on `dev` and no deployment or
  Cosmos operation is part of this task.
- Added private, server-derived identity-provider metadata and an explicit
  ownership schema version to new progress writes without changing the current
  document ID or `/userId` partition strategy.
- Public progress responses intentionally omit the new ownership metadata.
- Added API coverage proving browser-supplied ownership metadata is ignored and
  legacy records acquire server-derived metadata on their next successful save.
- Validation passed: API tests (7/7), root tests (152/152), lint, typecheck,
  formatting, data validation, i18n validation, and full Playwright (25/25).
- The required web-game client pass was visually inspected against anonymous
  Dev: the Word Quest title screen and text state matched, no console errors were
  recorded, and no authenticated API or Cosmos write was attempted.

## TODO / Suggestions for next agent

- Before enabling multiple providers, introduce a canonical application account
  ID and proof-based account linking; never link accounts by email alone.
- Treat any switch from preconfigured Entra authentication to custom OIDC as an
  identity-migration event and verify it with dedicated Dev accounts.

## 2026-10-01 - Old Dev migration bridge implementation

- Owner explicitly deferred production live two-account isolation and authorized Step 3. Production placement passed (one matching post-release record in `progress_prod`, zero in `progress_dev`); historical telemetry collection was disabled. Updated acceptance PR #201 with these results and deferrals.
- Created `feature/old-dev-migration-bridge` from accepted Dev `45f54ca6d8fc351c0cf51e2ca262086a58661a1e`.
- Added authenticated, old-origin `POST /api/migration/start`, default-disabled Dev issuance guards, server-only snapshot ownership, 256-bit random tokens, hash-only operation IDs, bounded snapshots/revisions, 15-minute expiry, one-hour TTL and no-store responses.
- Added the old-Dev-only Word Quest copy-token panel, capture/expiry messaging, sync-readiness gate and in-memory token clearing. Added required module precaching and bumped the service worker cache version.
- Azure actions: created `llb1/accounts_dev` with `/pk`, existing shared throughput, automatic indexing and TTL On (no default); verified TTL after explorer reload. No production settings, progress records or hosting plan changed.
- Azure limitation: embedded SWA environment controls could not be operated; native Brave fallback access was not approved. Old Dev accounts/issuance settings remain pending. Issuance remains disabled by default.
- Verification: root tests 152 passed, API tests 12 passed, full Playwright 28 passed before adding the additional expiry edge case; focused bridge tests cover guest/origin visibility, readiness, explicit copy, sign-out clearing, generation failure and expiry. Lint, typecheck, data/i18n validation and touched-file formatting passed. Snapshot UI screenshot uses a synthetic test token.
- Deployment state: old Dev still serves accepted `45f54ca6d8fc351c0cf51e2ca262086a58661a1e`; bridge deployment SHA/live issuance acceptance are pending. Instructions and recovery are in `docs/old-dev-migration-bridge.md`. Stop before Chunk 4 until the bridge handoff passes.

## 2026-10-07 - Merged bridge deployment and Dev accounts setting

- Owner merged PR #202 and authorized the next steps. Dev SHA `6b8c377c3298121cb6d1985be5e5bf15c9354548` passed CI and Azure Dev deployment (runs 37664952040 and 37664952672).
- Saved and verified `COSMOS_ACCOUNTS_CONTAINER=accounts_dev` through Azure Portal on the old Dev environment; `COSMOS_PROGRESS_CONTAINER=progress_dev` remains in place. Production settings and progress records were not changed.
- Live read-only verifier passed health and anonymous progress GET/POST rejection; anonymous migration POST returned 401. The deployed guest page contains the migration panel and hides it.
- Owner confirmed dedicated-account sign-in/save/refresh restore. Then saved and verified old Dev `MIGRATION_ISSUANCE_ENABLED=true`; owner confirmed live token generation, capture/expiry and explicit copy.
- Read-only Cosmos metadata returned one operation created at `2026-10-07T18:26:29.742Z`, expiring exactly 15 minutes later, TTL 3600, source revision 8, pending status, attempt count 0, schema version 1. Aggregate storage-shape query returned 1 for migration-prefixed 74-character equal id/pk keys with no raw token/userId properties. No player snapshots or identity values were read.
- Chunk 3 accepted with the previously authorized live two-account isolation deferral. Frozen bridge fallback is `6b8c377c3298121cb6d1985be5e5bf15c9354548` at the existing old Dev URL. Chunk 4 may proceed; redirect Dev workflow before further Dev merges to preserve this build.
- Chunk 4 preparation: Azure creation form prepared for `latvian-auth-dev-014d1e`, `AZ-myWebApp`, West Europe, Standard hosting, deployment-token authorization, manual source and enterprise edge off. Official pricing page displayed US$9/app/month plus applicable taxes/currency conversion and usage. Owner answered “Hold off on the paid resource.” Creation was not submitted. Reverted the uncommitted workflow redirection; no new resource or secret transfer occurred. Keep acceptance documentation as a draft until an approved workflow redirection can preserve the old bridge build.

## 2026-10-07 - Replacement email/password implementation plan

- Owner chose email/password-only authentication on Free hosting and confirmed that existing accounts/progress need not be preserved because they are the only current user.
- Added `docs/email-password-authentication-plan.md`: External ID hosted registration/login/reset with direct MSAL integration and server-validated API access tokens; existing Free resource/URLs, managed Functions and Dev/production progress containers retained.
- Removed migration, canonical-account/linking registry, social providers and the paid isolated resource from the replacement scope. New accounts start fresh; no database/account deletion is necessary.
- The plan includes a Free API feasibility gate, environment-specific app registrations, token/ownership validation, guest/account state isolation, automated/live acceptance and manually approved production release/recovery.
- This turn creates a plan only. Azure configuration, migration issuance, app code, accounts, progress and deployments have not been changed. Historical PR #203 instructions are superseded by this replacement plan and must be reconciled before implementation.

## 2026-10-07 - Retire the migration setup (replacement Step 1)

- Owner authorized the first step of the replacement email/password plan. Created `feature/retire-migration-setup` from the acceptance-record branch, preserving its history and the new plan.
- Azure: saved and verified Dev `MIGRATION_ISSUANCE_ENABLED=false`; removed Dev `COSMOS_ACCOUNTS_CONTAINER`. Progress stays `progress_dev`; no production setting, record, container, credential or hosting-plan change.
- Removed migration endpoint/route, frontend helper/panel/styles, accounts-container helper and migration-specific API/browser tests. Bumped service worker to v27, retaining cloud-progress precaching and the title-page scrolling fix. Existing Microsoft sign-in/cloud-sync handlers and gates are unchanged.
- Archived the previous multi-provider plan, recorded the replacement plan and superseded old freeze/migration instructions. Opened retirement PR #204 and closed PR #203 as superseded; existing Free Dev workflow remains the deployment path.
- Root tests 152 passed, remaining API tests 7 passed and full browser suite 25 passed. Lint, typecheck, full formatting, data/i18n validation and diff checks passed. Azure reads confirmed Free hosting and production `progress_prod` with no migration setting. Live read-only Dev and production health/anonymous progress rejection checks passed; no Cosmos writes were performed by the verifier.
- Existing deployment baselines: Dev `6b8c377c3298121cb6d1985be5e5bf15c9354548`, production `cbed2cc6f70f245a3673548cc5f2deb57e764950`. Live issuance is disabled now; code removal awaits Dev merge/deployment. External ID configuration and new email/password implementation have not started.

## 2026-10-11 - Email/password Free-hosting feasibility preparation

- Owner merged retirement PR #204 and authorized the next steps. Verified Dev `7ebbff8fe9e1d242e6043ab94ed8126dba2f27b3`, successful CI/deployment (38119742785/38119742912), health/anonymous progress rejection and retired migration endpoint 404.
- Created `feature/email-password-auth-probe` from merged Dev. Built a separate test page, public test configuration endpoint and Dev-only JWT-check endpoint. Neither reads/writes progress; existing Microsoft sync handlers and route gates are untouched.
- Created customer tenant Latvian Learning Customers (`latvianlangb1users.onmicrosoft.com`, ID `9e6866a8-fb0e-43ba-b4bb-e993e4a68c20`), Latvia/Europe, under the project subscription/resource group. An initial Entra sign-in routed to RTU; stopped that route, switched to the project Default Directory and made no RTU configuration changes.
- Owner explicitly approved Platform Policies for Dev API/browser registrations and separate admin consent for openid, offline_access and delegated progress.access. Registered API `5f30ff08-511e-4229-93f0-d449346f16c8` (v2 tokens verified) and SPA `2eabc55c-c1c0-43b4-8c4a-36c1d2111c58` (exact Dev callback); no secrets created. Browser User.Read removed. Created/assigned EmailPasswordDev, collecting only email, and verified email recovery enabled/SMS disabled without changing method policies.
- Paused at the owner's request with uncommitted work and no Dev authentication settings saved; resumed on explicit request. Saved and verified all eight AUTH*PROBE_ENABLED/EXTERNAL_AUTH*\* public settings on Dev, retaining progress_dev and Free hosting. Production settings and database credentials untouched.
- Pinned MSAL 5.25.0/jose 6.2.12; added reproducible SDK bundle/license staging to Dev deployment and local browser-test startup. Service worker v28 bypasses auth callbacks/APIs/test assets; no-referrer protects callback codes.
- Verification: root 153, API 13 and full Playwright 27 passed; focused probe checks cover phone/desktop layout, malformed success rejection and no unhandled page errors. Lint/typecheck/format/data/i18n/diff checks passed. Audits list no vulnerability entry for new auth libraries; existing findings left outside scope.
- Setup and implementation are prepared; deployment SHA and live signup/login/reset/real-token Free API acceptance remain pending. Do not start Step 3 until that gate passes. Production baseline remains cbed2cc6f70f245a3673548cc5f2deb57e764950. Detailed public config, acceptance and recovery are in docs/email-password-dev-probe.md.
- Opened PR #205. Its first clean quality run could not resolve the API's dynamic jose imports because only root dependencies were installed. Updated quality bootstrap to install API dependencies before repository-wide lint; the independent API job already passed. Recheck the corrected head before merge.

## 2026-10-14 - Dev sign-in discovery fix

- PR #205 merged as `b719f5afc60818c8bb897bcf0b3328a5e1c60e16`; Dev deployment and CI passed. Live health/anonymous progress gates pass, public probe configuration is available, and unauthenticated probe access returns 401. Production probe endpoints remain 404.
- Reproduced the owner's sign-in startup failure. Pinned MSAL validates the GUID-based discovery issuer against `knownAuthorities`, but the page supplied only the named sign-in hostname.
- Return both validated server-configured sign-in/issuer hosts in public configuration and pass them to MSAL. No authentication checks are disabled and no Azure permissions/settings are changed.
- Added a browser regression using the real pinned MSAL bundle and synthetic discovery metadata. The hosted sign-in navigation assertion failed before the fix and passed afterward. This remains a local regression, not live customer acceptance.
- Owner-controlled Dev merge/deployment and real signup, email verification, login, refresh, logout and password-reset acceptance remain required before Word Quest integration.
- Verification on Node 20.20.2: root 153 tests, API 13 tests and full Playwright 29 tests passed, including configured issuer acceptance and unrelated issuer rejection with the real SDK. Lint, typecheck, format, data/i18n validation and diff checks pass. Initial browser-suite invocation failed to start its server because nested npm exec inherited package options; reran with Node 20 directly on PATH and the suite passed.

## 2026-10-14 - Diagnose callback failure after email verification

- PR #206 merged as `1e6813c528dcf517ea3ba8714ba66dd5b365b4d9`; CI and Dev deployment passed. Dev configuration returns 200 with both expected hosts and the deployed script uses them; anonymous probe still returns 401.
- Owner reports email verification followed by the configuration-disabled message. The page previously mapped every initialization exception, including callback rejection, to that message. Actual live callback error code remains unknown.
- Separate configuration/startup/callback failures, show only allowlisted SDK codes/numeric AADSTS codes and permit a fresh login after callback failure. An older cached account cannot enable access checks after a failed callback. No raw errors, credentials, callback URLs or identity claims are displayed/logged.
- Added real-SDK synthetic callback rejection and successful code/token exchange tests, plus safe-code redaction unit coverage. Neither uses customer credentials or proves live acceptance.
- Automatic approval review blocked opening customer-tenant Azure sign-in logs because the login redirect could route to RTU. Stopped that route; no directory or permission change performed. Continue via the safe Dev status code instead.
- Owner-controlled Dev merge/deployment and live error-code diagnosis or successful sign-in/access acceptance remain pending. Word Quest integration remains gated.
- Verification: Node 20 root 154 tests, API 13 tests and full Playwright 31 tests passed. Lint/typecheck/format/data/i18n and diff checks pass. Synthetic full callback success and controlled callback error both use the real pinned SDK; these do not replace owner acceptance.
- Owner confirmed API access rejection with `{ "error": "authentication required" }`; password creation/callback succeeds. Added fixed Dev-only API rejection codes (missing/malformed bearer, issuer/audience/lifetime/signature/identity/client/scope failure and service unavailability). Shared authentication responses stay generic; only the guarded probe exposes codes. Frontend allowlists those codes and never displays raw API errors or claim values. Actual live cause remains pending the updated probe result.
- Azure's maintained issue #275 describes the managed Function gateway overwriting Authorization. Move the signed application bearer to X-Latvian-Authorization and read only that header. Standard/platform Authorization and SWA principal headers cannot grant app access. Tests cover a preserved signed app token alongside a different platform header and rejection of standard-header-only requests. This avoids the documented collision; the owner's live cause/success still needs the deployed result.
- Updated transport/diagnostic verification on Node 20: root 154, API 14 and Playwright 31 passed; lint/typecheck/format/data/i18n/diff checks pass. No live owner token was inspected or copied. PR #207 carries both the earlier callback diagnostics and this transport/API diagnostic change; live acceptance remains pending its Dev deployment.

## 2026-10-14 - Word Quest email/password integration

- Owner accepted the live probe (Access verified), refresh/logout and password reset and authorized Step 3. PR #207 merged Dev `ec247afba815119cdfd5cf01b390ceafbd510aca`; this is the accepted Free-hosting feasibility baseline.
- Created `codex/word-quest-email-password`. Replace both progress handlers with the existing signed-token validator and remove SWA role gates atomically. Server-derived External ID hash owns existing Cosmos partitions; metadata schema 2. No live records were changed.
- Added public auth config and a validated owner session endpoint, shared MSAL/client helpers, exact existing callback return page, token-bound cloud requests and guest/account-specific local namespaces. No guest/old-state import. Remove temporary probe endpoints and legacy principal parser; no legacy fallback.
- Cancel timers/requests/conflict decisions on logout, retain pending snapshots until acknowledgement and reject stale session responses. Expired/forbidden authentication needs explicit sign-in; conflicts need an explicit choice before replacement. Guests remain playable/offline.
- Renamed authentication bundle build to build:auth-client and retain Dev staging. Service worker v29 precaches Word Quest/auth helper/public SDK assets and bypasses private APIs/callbacks. Production staging is a later main-branch release prerequisite.
- Focused tests found fixture timing issues and MSAL v5's navigateToLoginRequestUrl option is passed to handleRedirectPromise (not auth configuration); fixed and verified real SDK callback success/error paths.
- Skill action loop exposed a no-op advanceTime hook that captured unfinished animations. Updated it to advance real browser frames; inspected map/desktop/mobile screenshots and game text. Local static-server console 404 for authConfig is expected because Functions are not hosted locally; mocked integration tests check page exceptions.
- Prepared docs/word-quest-email-auth.md with acceptance, owner namespaces, offline behavior, recovery and production prerequisites. Dev merge/deployment and real save/refresh/second-browser/two-account checks remain pending.
- Final Node 20 verification: root 156 tests and API 12 tests passed; lint/typecheck/format/data/i18n/diff checks pass. Full browser suite: 36 passed with CI's single-worker setting. New cases include server-signed two-identity partition ownership, expired/changed sessions, cleared local cache after failed provider logout, stale load/save responses, exact conflicts and real PWA offline refresh.
- Full-suite attempts exposed an existing Decl6 smoke locator selecting the substring distractor “brokastis (sg)” for expected “brokastis”. Fixed only its test locator to match the exact labelled answer; the full suite then passed. Gameplay source for Decl6 is unchanged.
- Inspected signed-in desktop, guest mobile and battle screenshots from the browser tests, plus the skill map screenshot and game-state output. Skill mouse bursts require a canvas and are ignored for this DOM game; repo browser specs exercise battles and authentication directly. No raw owner credentials/tokens or live Cosmos records were used.
- Next: owner merge to Dev, verify deployed auth config/session/progress/probe-removal and complete real game save/refresh/second-browser/two-account acceptance. Production registration, callback/settings and build staging remain Step 5 prerequisites.
- Final SDK cache review: logout now clears every cached account/token for this application (not just the active account), including local cleanup after provider failure. A multi-profile regression confirms a fresh page cannot silently select a second cached learner after logout. This matches the accepted probe's all-account logout behavior.
- Final guarded head verification: root 157 tests, API 12 tests and full browser suite 36 tests passed. The validator also rejects non-string oid claims (including a signed one-element array) before deriving ownership. The logout-cache guard and claim-type regression are included in PR #208; deployment/live game acceptance remain pending.
- Account-transition gameplay regression: with provider logout forced to fail before navigation, the old completed battle could award its 40 XP again to the guest namespace on Enter. The focused test reproduced the failure. Clear currentWorld/battleState whenever selecting a local owner, and discard delayed battle-data loads from an earlier session/namespace. Added a failed-logout browser regression; this is a local synthetic failure test, not an owner credential test.
- Final transition head: all 38 browser tests pass; root 157/API 12 and quality checks pass. The failed-logout regression now preserves guest XP and clears old battle context. A separate same-owner reconnection case keeps the active battle when local/cloud progress agree. Final changes are carried by PR #208; no implementation deployment or real game save/restore acceptance yet.

## 2026-10-14 - Fresh account cloud response fix

- Owner merged PR #208; Dev deployment and CI succeeded for `1d94d489bb036a3450b4f838311d2238173b2cca`. Public config matches the Dev registrations, anonymous session/read/write requests are rejected, retired probes return 404 and the callback/SDK/SW v29 are deployed. Production authConfig/authSession remain absent. No live records were changed by these checks.
- Owner reported “Cloud progress is unavailable” during game acceptance. Reproduced a fresh-account defect with the installed Azure Functions HttpResponse: `jsonBody: null` becomes HTTP 200 with an empty body, which the browser correctly rejects as invalid JSON. Requested only the owner's getProgress status/body to confirm the live failure.
- Send explicit JSON null for both missing-record paths, preserving Content-Type through the runtime no-store wrapper. Regression tests use the actual Functions serializer, covering Cosmos 404 and an undefined resource. No authentication or storage ownership checks are weakened.
- Node 20 verification: root 157/API 13 tests and all 38 Playwright tests pass; data/i18n, lint, format, typecheck and diff checks pass. The browser suite required permission to start its localhost server. Fix deployment and owner save/restore acceptance remain pending.
- PR #209 merged and deployed Dev `5cea6b90fbbbfa7bae1af3c5e58996ffce9e90ee`; CI/deployment and read-only health/anonymous progress checks pass. Owner confirmed sign-in/cloud save/refresh restore pass, followed by same-account restore in another browser. Game logout/guest separation, live two-account isolation (or documented test limit) and Dev storage placement confirmation remain before the release decision. Production preparation is still Step 5.

## 2026-10-14 - Direct sign-out

- Owner reported the hosted sign-out account picker and requested direct logout for the active account. Pass the provider-issued opaque logout hint while preserving all-account app cache clearing and the existing local guest transition. Never substitute email/username or pass an account that would leave other cached app accounts behind.
- Dev SPA needs the optional login_hint ID claim; requested the owner enable it in Latvian Learning Customers only, then sign in again after deployment. Browser inventory has no open portal tab; no tenant navigation or registration setting was changed by the agent. Production needs the same claim when its separate SPA is configured.
- Bumped the service worker to v30 so the cached authentication helper updates. Unit tests cover both hint sources and invalid/missing hints; a real MSAL synthetic callback/logout test checks the outgoing hint and guest return. Live direct logout acceptance remains pending configuration and deployment.
- Node 20 verification: root 159/API 13 and all 38 browser tests pass, including the real SDK hinted logout and existing account/guest isolation cases. Data/i18n, lint, format, typecheck and diff checks pass. Optional claim configuration is not yet confirmed; no production configuration or release was performed.
- PR #210 merged and deployed Dev `c8060870772747670b47f0e364fc057887b78af0`; CI/deployment succeeded. Owner confirmed direct sign-out works. This confirms the available live logout flow, but guest XP separation/refresh staying signed out, live second-account isolation (or explicit limitation) and Dev storage placement confirmation remain to be recorded before the release decision. No raw claims/tokens were requested and optional claim settings were not independently inspected.
- Owner confirmed both remaining browser checks pass: logout/refresh retains guest mode without account XP, and a second email/password account starts fresh while the first retains its progress. Available live Dev account/game acceptance is complete. Storage placement remains: requested the non-secret Dev container setting and only External ID schema-2 Word Quest counts in progress_dev/progress_prod. Azure CLI is unavailable and no Azure connector/open portal tab is available; no alternate credential access was attempted.
- Reviewed main's production workflow: it retains manual dispatch, main-history/authenticated-baseline validation, required CI, the production environment approval and production deployment secret. It currently archives static sources without staging the ignored MSAL SDK bundle. Step 5 must add the existing Node/build-auth-client staging before production release, configure separate production registrations/settings/claim and perform production acceptance. No release or production setting was changed.
- Owner reported schema-2 External ID Word Quest counts: progress_dev=1, progress_prod=0. Live placement passes; a second account that did not save can have no record. The container setting was not separately reconfirmed. Available Dev acceptance is complete. Prepare production changes without deploying; production registrations/settings and the explicit release remain required.

## 2026-10-14 - Production cutover preparation

- Reconciled main into the accepted Dev preparation branch. Preserved both histories in documentation, main's manual production workflow and exact-SHA reusable CI inputs/checkouts. Added the pinned SDK/license build to production staging, conditional on the selected recovery/release checkout containing the build script. No production dispatch/settings change occurred.
- Added docs/email-password-production-cutover.md with separate named production SPA/API/flow, exact callback, login_hint claim, minimal delegated permissions, public setting keys, owner release approval, acceptance and recovery. Production app IDs are still unknown; their registrations/consent/configuration remain pending in the existing customer tenant. Dev-specific policy/consent approval is not presented as production approval.
- Node 20 verification: root 159/API 13/all 38 Playwright tests pass; lint, format, typecheck, data/i18n and diff checks pass. Workflow YAML assertions verify manual dispatch, exact-SHA CI and approval references; temporary staging contains the pinned SDK and license. Production stays at the recorded Microsoft-only recovery SHA.

## 2026-09-26 - Authentication rollout baseline

- Objective: begin the Microsoft, Google and email OTP rollout plan at Chunk 0 without changing production.
- Local Dev baseline is `45f54ca6d8fc351c0cf51e2ca262086a58661a1e`. GitHub reports `main` at `2e9d43cbc9e97e6bcc37368d4cb1cd5ff5372856`, which already includes the accepted Dev commit; local `main` is stale.
- Root tests 152/152, API tests 7/7, Playwright 25/25, lint, formatting, typecheck, data validation and i18n validation passed locally under Node 22. CI uses Node 20.
- Azure Portal confirms the existing `Latvian` resource is Free, with production at `https://red-ocean-014d1e603.4.azurestaticapps.net` using `progress_prod` and Dev at `https://red-ocean-014d1e603-dev.westeurope.4.azurestaticapps.net` using `progress_dev`.
- Azure deployment history identifies historical production build `11bb4ef32acae49772896e91e2f66c8f9a474108`. Code at that SHA has anonymous progress routes and trusts browser-supplied user IDs, so it cannot serve as a safe rollback after the authenticated release. There is no safe authenticated production rollback SHA yet.
- Chunk 0 handoff: the forward minimum is `45f54ca6d8fc351c0cf51e2ca262086a58661a1e`; the exact release SHA will be chosen from `main` when dispatched. The historical production SHA is recorded above, and no safe authenticated rollback SHA exists yet.
- Azure actions: read-only portal review. No settings, deployments or Cosmos records were changed.
- Next: add and validate the manual production release workflow; establish a protected GitHub production environment before any deployment.

## 2026-09-26 - Manual production workflow implementation

- Objective: implement Chunk 1 of the authentication rollout plan without dispatching a production release.
- Added `workflow_dispatch` production deployment with a full SHA input, `main` ref and ancestry checks, and an authenticated-baseline guard against the historical anonymous build.
- Reusable CI now checks out the exact requested SHA in its quality, API and Playwright jobs; the production deploy job checks out that same SHA after CI and references the `production` environment and its dedicated token name.
- Verification: workflow YAML parses, touched files pass Prettier, and local lint, typecheck and `git diff --check` pass. The release validation script accepts the authenticated baseline and rejects the historical anonymous build and a `dev` dispatch. Full root/API/Playwright tests passed at Chunk 0 baseline. GitHub Actions execution awaits a push.
- Azure actions: copied the existing production deployment token without resetting it or exposing its value. No production deployment or Cosmos change occurred.
- GitHub actions: after explicit user approval, configured the `production` environment with `@oerbey` as required reviewer and the environment-scoped `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` secret. A subsequent explicit approval authorized disabling administrator bypass; GitHub confirmed the updated protection rule. The environment has no separate branch restriction, while the workflow itself rejects a non-`main` dispatch.
- Pushed `feature/auth-release-workflow` and opened draft PR #199 against `main`. GitHub CI passed on commit `29b9df4c473259e08a67abe73de46891aa3a5f56`: quality, API and Playwright jobs all succeeded. Production remains at historical `11bb4ef32acae49772896e91e2f66c8f9a474108`.
- Chunk 1 handoff: workflow syntax and CI passed, the reviewer and dedicated environment secret are configured, and no production deployment occurred. The PR can be reviewed and merged when the owner accepts the first-release recovery approach. Any production dispatch belongs to Chunk 2 and requires separate owner approval.
