# Task 05 - Split travel-tracker module

Source: ideas/architectural-review-2026/02-architecture-improvements.md

Goal
- Reduce file size and separate concerns in travel-tracker.

Scope
- Split src/games/travel-tracker/index.js into smaller modules:
  - state and data prep
  - rendering and DOM updates
  - event handlers
  - data loading helpers
- Keep the public entry point as index.js.

Acceptance criteria
- Travel-tracker loads and plays with the same behavior.
- index.js stays focused on wiring and orchestration.
- No duplicated logic introduced.
