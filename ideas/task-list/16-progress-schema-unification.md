# Task 16 - Progress schema unification

Source: ideas/architectural-review-2026/05-data-modeling.md

Goal

- Use a single progress schema across all games with migrations.

Scope

- Define a shared progress schema in storage.js.
- Migrate existing per-game progress into the shared format.
- Update games to read/write via the unified schema.

Acceptance criteria

- Existing progress data migrates without loss where possible.
- New progress writes follow the unified schema.
- No game crashes with missing or old data.
