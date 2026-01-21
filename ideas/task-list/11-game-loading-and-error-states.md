# Task 11 - Game loading and error states

Source: ideas/architectural-review-2026/04-ui-ux-improvements.md

Goal
- Add consistent loading and error UI for each game page.

Scope
- Add a lightweight loading overlay per game page.
- Use the existing error UI to show load failures.
- Ensure the UI is accessible (aria-live for loading, role alert for errors).

Acceptance criteria
- Each game shows a loading state while data and strings load.
- Failed loads surface a user-facing error state.
- No layout regressions during normal load.
