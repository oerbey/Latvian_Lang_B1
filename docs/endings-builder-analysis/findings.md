# Endings Builder Review

## Snapshot

- UI scaffold lives in `endings-builder.html:52` with Bootstrap navigation and a single-column `.eb-wrapper`.
- Core logic is driven by vanilla modules such as `src/games/endings-builder/index.js:201`, `src/games/endings-builder/game-shell.js:42`, and `src/games/endings-builder/dnd.js:1`.
- Morphology data sources are JSON driven (`data/endings-builder/tables.json:1`, `data/endings-builder/items.json:1`) and localized strings load from `i18n/en.json:55`.

## Strengths

- **Data driven:** Stems, schemas, and localized copy are decoupled from code, allowing non-dev updates.
- **Accessibility minded:** Drag sources and slots expose focusable roles in `src/games/endings-builder/dnd.js:5`, while `src/games/endings-builder/game-shell.js:52` and `src/games/endings-builder/game-shell.js:68` add the strict-mode switch and the `aria-live` region for feedback.
- **Offline resilience:** Embedded fallbacks handle `file://` loads through `window.__ENDINGS_*` payloads (`src/games/endings-builder/index.js:8`, `src/games/endings-builder/endings-resolver.js:3`).

## Pain Points

- **Touch ergonomics:** Pointer-up drops in `src/games/endings-builder/dnd.js:103` offer little positional feedback, so touch users must rely on guesswork when aligning with slots.
- **Monotone progression:** Progress counters only increment/decrement without mastery thresholds or spaced review (`src/games/endings-builder/index.js:392`).
- **Limited pedagogy:** Explanations reduce to formulaic strings like `stem + case` and omit grammar context or examples (`src/games/endings-builder/index.js:467`).
- **Looping rounds:** `pickNextRound()` reorders by lowest score, frequently repeating earliest items and risking boredom (`src/games/endings-builder/index.js:241`).
- **Dense layout:** Dual `.eb-board` grids plus keypad stack vertically, forcing heavy scroll on small devices (`src/games/endings-builder/styles.css:33`).

## Mobile-First Assessment

- 44px tiles meet minimum tap size but vertical stacking leaves minimal space once the keypad and navbar appear.
- Drag handles require precision and, while a tap-to-place fallback exists (`src/games/endings-builder/dnd.js:92`), the UI never surfaces it or adds haptic/visual confirmation.
- Controls (Check/Next/Rule) sit at the top, away from thumb reach; keypad is always visible even when not needed.
- No responsive typography tokens or spacing adjustments beyond Bootstrap defaults.

## Modernization Opportunities

- **High impact:** Adopt a componentized front-end stack (e.g., Vite + TypeScript) to encapsulate GameShell, Board, Keypad, and analytics hooks.
- **High impact:** Validate JSON schemas at build time and surface authoring lint checks for new rounds/localizations.
- **Medium impact:** Introduce telemetry for round start/completion, hint usage, and error reporting to drive curriculum insights (privacy-first storage).
- **Medium impact:** Layer progressive enhancement: maintain vanilla fallback but ship richer gestures/animations via modules loaded conditionally.

## Build Ideas (Prioritized)

1. **Now – Adaptive scheduling:** Move to a Leitner-style queue with mastery levels, streak milestones, and spaced repetition intervals.
2. **Now – Touch-first interactions:** Offer tap-to-select/tap-to-place flow, animated slot previews, and optional drag for desktop precision; add gentle haptic cues when available.
3. **Next – Guided grammar hints:** Surface rule excerpts, example sentences, and audio clips tied to each round, with hint counters contributing to analytics.
4. **Next – Responsive redesign:** Create mobile-first layouts with sticky lower control bar, collapsible keypad, and fluid typography using `clamp()` values.
5. **Later – Personal progress view:** Store learner profile (language choice, strict mode, mastery) and expose a progress drawer summarizing recent wins/mistakes.
6. **Later – Instructor tooling:** Allow JSON deck imports/exports, error reports with structured metadata, and automatic screenshots for debugging.

## Next Development Tasks (Prioritized)

1. **Now – UX validation:** Run targeted usability sessions (phone + desktop) to capture drag expectations, keypad usage, and clarity of feedback messaging.
2. **Now – Responsive wireframes:** Produce annotated layouts for <360px phones, tablets, and widescreen desktops outlining control placement and animation cues.
3. **Next – Adaptive engine design:** Document data structures for mastery tracking, review cadence, and cross-device persistence strategy.
4. **Next – Interaction spec:** Define accessible tap/drag behaviors, focus management, aria announcements, and visual states for success/error.
5. **Later – Frontend upgrade plan:** Evaluate bundler/tooling migration, define component boundaries, and outline incremental migration steps from existing modules.
6. **Later – Content schema extension:** Extend endings data to include metadata (frequency, examples, audio ids) and create validation scripts plus localization workflow updates.
7. **Later – Analytics blueprint:** Draft event schema, storage approach, and privacy guardrails for capturing learner progress and hint usage.
