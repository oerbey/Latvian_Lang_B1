# Task 04 - Migrate one game to GameBase (pilot)

Source: ideas/architectural-review-2026/02-architecture-improvements.md

Goal

- Validate the GameBase helper by migrating one smaller game to use it.

Scope

- Pick one smaller game (passive-lab recommended) and refactor its entry module to use GameBase hooks.
- Keep UI and gameplay behavior identical.

Acceptance criteria

- The selected game uses GameBase for init and cleanup.
- No functional or UI changes beyond refactor.
- Game still passes manual smoke test (start, play, reset).
