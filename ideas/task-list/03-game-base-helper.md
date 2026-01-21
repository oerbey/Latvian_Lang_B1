# Task 03 - Add a shared GameBase helper

Source: ideas/architectural-review-2026/02-architecture-improvements.md

Goal
- Create a shared helper for common game lifecycle behavior (init, cleanup, progress load/save, optional i18n load).

Scope
- Add a new module under src/lib (for example src/lib/game-base.js).
- Provide hooks for init, teardown, progress, and optional i18n load.
- Keep the helper framework-light and usable by any game module.

Acceptance criteria
- New helper module exists with documented lifecycle hooks.
- Helper does not change runtime behavior until a game opts in.
