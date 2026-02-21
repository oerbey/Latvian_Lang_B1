Original prompt: Please review Darbības Vārdi exercise. The UI looks too dark in the dark mode and when I clicked to words for selecting, colors are hard to read (same in light mode as well). Please do some adjustments on it. Also Read loud of the words should be optional. Please add a toggle for it. Do your changes in a remote branch.

- Created branch `codex/darbibas-ui-contrast-speech-toggle`.
- Located Darbības Vārdi page at `darbibas-vards.html` and shared matching engine/styles at `src/lib/matching-game.js` and `assets/styles.css`.
- Confirmed selected word color styles are shared via `.word-card[aria-pressed='true']` and Darbības page overrides can be applied safely.
- Confirmed read-aloud is currently controlled by `#btn-speak` button in shared matching engine; will add explicit toggle UI and support both toggle/button for compatibility.

- Replaced Darbības Vārdi read-aloud action button with a dedicated switch (`#speak-toggle`) in the board actions area.
- Extended matching engine to support both legacy `btnSpeak` buttons and new `speakToggle` switches.
- Added persisted speech preference support via optional storage key (`storageKeys.speak`), and cancel active speech when toggled off.
- Wired Darbības Vārdi to persist read-aloud preference using `dv_speak`.
- Improved Darbības page card contrast and readability in both modes:
  - softer but high-contrast selected state,
  - clearer disabled state,
  - stronger hover border contrast,
  - added styles for the new read-aloud switch.
- Lightened dark-mode Darbības theme surface/background tokens to reduce the “too dark” appearance.
- Updated e2e Darbības test to assert speech switch presence/default state and toggle behavior.
- Validation:
  - `npm run lint` ✅
  - `npm test` ✅
  - `npm run test:e2e` ✅
- Note: an ad-hoc direct Playwright screenshot script failed under sandboxed Chromium launch permissions, but project Playwright test runner executed successfully.
