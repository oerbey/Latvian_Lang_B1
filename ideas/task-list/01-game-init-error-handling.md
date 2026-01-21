# Task 01 - Game init error handling

Source: ideas/architectural-review-2026/02-architecture-improvements.md, 01-executive-summary.md

Goal
- Remove unhandled top-level awaits by wrapping game initialization in an async init with try/catch.

Scope
- Update game entry modules that use top-level await (start with endings-builder, travel-tracker, and any others found).
- Use the existing error UI helper so users see a friendly message when init fails.
- Keep gameplay behavior the same on success.

Acceptance criteria
- No top-level await runs without a try/catch wrapper in game entry modules.
- A failed data load shows the fatal error UI instead of leaving a blank or broken page.
- Normal game flow is unchanged when data loads correctly.
