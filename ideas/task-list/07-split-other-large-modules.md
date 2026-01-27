# Task 07 - Split other large game modules

Source: ideas/architectural-review-2026/02-architecture-improvements.md

Goal

- Reduce file size and separate concerns in other large game modules.

Scope

- Split the following into smaller modules with index.js as entry:
  - src/games/duty-dispatcher/index.js
  - src/games/decl6-detective/index.js
  - src/games/passive-lab/index.js
  - src/lib/matching-game.js
- Follow the same patterns as travel-tracker/endings-builder splits.

Acceptance criteria

- Each game still runs with identical behavior.
- Orchestration stays in index.js or a single entry file.
