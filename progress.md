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
