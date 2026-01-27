# Task 02 - Remove loadJSON shadowing in travel-tracker

Source: ideas/architectural-review-2026/02-architecture-improvements.md, 13-quick-wins.md

Goal

- Rename the local fetch helper so it no longer shadows the imported storage loadJSON.

Scope

- Update src/games/travel-tracker/index.js to rename the local async function and update its call sites.
- Keep the storage loadJSON import for localStorage usage only.

Acceptance criteria

- No function in travel-tracker shadows an imported helper name.
- Behavior for data fetching and storage remains unchanged.
