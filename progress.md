Original prompt: "I merged previous changes to master branch. Create a new branch for Phase 5 & 6. You can find the phase descriptions below. Phase 5: Game‑Specific Art Pass. Add simple visual motifs per game (icons, subtle background shapes, mini illustrations). Keep the shared core layout while letting each game have a distinct “skin” via a theme class. Phase 6: UX Refinements That Improve Visual Feel. Highlight input focus states and error text with visual “motion” (pulse/glow). Make CTA buttons visually dominant, with secondary actions muted. Use small soundless micro‑animations to make interaction feel responsive. Start to work with Phase 5. When needed generate images and icons."

Notes:

- Created branch `codex/phase5-6-art-ux` off `main`.

Phase 5 progress:

- Added `game-theme` + per-game theme classes on game pages (verbs, conjugation, endings, passive, travel, maini, duty, decl6, traits, traits match/expansion, week1).
- Added global theme-skin CSS in `styles.css` with per-game accents, background textures, and SVG mask motifs.

Playwright client:

- Tried to run the develop-web-game Playwright client on `http://127.0.0.1:5173/`.
- Chromium launch failed with `MachPortRendezvousServer` permission error in this environment, so no screenshots were captured.

Phase 6 progress:

- Added shared UX-motion keyframes in `styles.css`:
  - `llb1-focus-glow` for focus ring pulse.
  - `llb1-error-pulse` for error feedback text pulse.
  - `llb1-cta-breathe` for primary CTA emphasis.
  - `llb1-enter-rise` for section load motion.
- Added global `body.game-theme` interaction refinements:
  - Stronger `:focus-visible` treatment on controls and form inputs.
  - Clear primary CTA treatment (`.btn-primary`, `[data-cta='primary']`) with stronger elevation and subtle idle animation.
  - Secondary actions (`.btn-outline-secondary`, `.btn-secondary`, `.btn-light`) visually muted until hover.
  - Error-state highlighting for `.is-invalid`, `[aria-invalid='true']`, and common error labels/status selectors.
  - Motion-safe fallback with `prefers-reduced-motion: reduce`.
- Added match-shell specific motion/CTA refinements in `assets/styles.css` so later-loaded shell styles keep Phase 6 behavior.

Validation:

- Ran `npm run format`.
- Ran `npm test` (46 passed, 0 failed).

---

Sentence Surgery v2 improvements (current task)

- Created branch `codex/sentence-surgery-v2-improvements`.
- Fixed potential top-gap issue by updating `scripts/page-init.js` to apply nav offset only when navbar is fixed/sticky.
- Added bilingual in-page help modal (LV + EN) and info button on Sentence Surgery page.
- Improved bank handling:
  - Word bank now always unions provided `word_bank` with sentence tokens from `broken_lv`/`target_lv`.
  - Added bank hint text and clearer feedback for non-editable tokens.
- Added drag-and-drop interaction from bank tokens onto editable sentence tokens while keeping tap-to-replace.
- Added keyboard shortcuts in Sentence Surgery: `Enter` check, `N` next, `R` reset, `H` hint, `I` open info.
- Removed Sentence Surgery preview art from homepage card (now blank art area with icon only).
- Updated tests to cover modal open/close and drag/drop path.
- Bumped service worker cache version to `v15`.

TODO / verify before handoff:

- Run format/lint/unit tests/e2e and verify no regressions.
- Push branch to `origin` and share branch name + summary.
- Ran required develop-web-game Playwright client against `http://127.0.0.1:5180/sentence-surgery-passive.html` and inspected screenshot `output/web-game/sspv-v2/shot-0.png`.
- Observed expected UI state with bank hints + improved controls; console error output only contained expected CSP-meta warning.

---

English -> Latvian web-game iteration (current task)

- Request: build and iterate a playable web game using existing data to teach English <-> Latvian vocabulary, validated via develop-web-game Playwright loop.
- Added new page + game module:
  - `english-latvian-arcade.html`
  - `src/games/english-latvian-arcade/index.js`
  - `src/games/english-latvian-arcade/logic.js`
  - `src/games/english-latvian-arcade/styles.css`
- Game behavior implemented:
  - Loads existing vocabulary from `data/lv-en/units.json` + `data/lv-en/units/*.json`
  - Canvas gameplay: move catcher left/right to catch correct LV translation for an EN prompt
  - Score/streak/lives/round flow with start/restart and game-over states
  - Hooks added: `window.render_game_to_text`, deterministic `window.advanceTime(ms)`, fullscreen toggle (`f`)
- Integrated discoverability:
  - Added nav entry in `scripts/nav-config.js`
  - Added homepage card in `scripts/homepage.js`
  - Added theme skin tokens in `styles.css`
  - Added SW precache entries + version bump (`sw.js` -> `v16`)
- Added unit tests for pure game logic:
  - `test/games/english-latvian-arcade/logic.test.js`

Next:

- Run formatter + unit tests
- Run develop-web-game Playwright client loop and inspect screenshots/state/errors
- Fix issues found and iterate

Validation and iteration notes (develop-web-game loop)

- Ran local server on `http://127.0.0.1:5180` and executed repeated Playwright client loops via:
  - `/Users/onurerbey/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js`
- First loop issue:
  - Auto-click on `#start-btn` was flaky (`element is not stable`), and loop stopped early due to a CSP console error (`frame-ancestors` in meta CSP).
- Fixes applied:
  - Removed `frame-ancestors` from `english-latvian-arcade.html` meta CSP to avoid console error stopping the loop.
  - Added deterministic start button class (`.lv-en-arcade-start`) with animation disabled to stabilize click timing.
- Multi-iteration Playwright loops now produce full `shot-*.png` + `state-*.json` artifacts with no `errors-*.json`:
  - `output/web-game/lv-en-arcade-iter3`
  - `output/web-game/lv-en-arcade-iter5`
  - `output/web-game/lv-en-arcade-iter6`
- Additional gameplay fixes after artifact review:
  - Added `bestStreak` tracking and render in game-over message.
  - Ensured `player.velocityX` is reset when not in active play mode.
  - Increased card text wrapping tolerance for long Latvian phrases (smaller font + up to 3 lines).
- Explicit restart verification:
  - `output/web-game/lv-en-arcade-iter7` confirms `gameover -> Space restart` returns to `mode: play` with reset score/lives/round (`points:0`, `lives:3`, `round:0`).

Suggested next work:
- Add optional difficulty selector (drop speed/lives).
- Add compact on-canvas feedback marker (check/x) on catch for clearer learning signal.
