# Task 06 - Split endings-builder module

Source: ideas/architectural-review-2026/02-architecture-improvements.md

Goal

- Reduce file size and separate concerns in endings-builder.

Scope

- Split src/games/endings-builder/index.js into modules:
  - state
  - data loading
  - UI rendering
  - event handlers
- Keep existing CSS and HTML intact.

Acceptance criteria

- Endings Builder behavior is unchanged.
- Module boundaries are clear and documented at file headers.
