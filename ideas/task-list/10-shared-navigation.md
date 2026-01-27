# Task 10 - Shared navigation generation

Source: ideas/architectural-review-2026/04-ui-ux-improvements.md

Goal

- Eliminate duplicate navbar and footer markup across HTML files.

Scope

- Create a single navigation config (JSON or JS module).
- Render navbar and footer via a shared script (e.g., scripts/nav.js).
- Replace hardcoded nav sections in all HTML pages.

Acceptance criteria

- All pages show the same nav order and links.
- New games require one config update, not multiple HTML edits.
- Layout and styling remain unchanged.
