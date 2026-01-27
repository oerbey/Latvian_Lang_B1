# Task 08 - Refactor global state into a store

Source: ideas/architectural-review-2026/03-state-management.md

Goal

- Replace the mutable global state object with a store that supports get, set, subscribe, and reset.

Scope

- Update src/lib/state.js to export a store API.
- Update app.js and any dependencies to use the store API.
- Keep behavior identical while improving testability.

Acceptance criteria

- Direct mutation of state is removed or contained behind the store API.
- Store supports subscriptions for UI updates.
- Existing tests pass or are updated accordingly.
