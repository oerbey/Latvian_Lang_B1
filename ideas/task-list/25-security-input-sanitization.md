# Task 25 - Input sanitization and storage validation

Source: ideas/architectural-review-2026/09-security-considerations.md

Goal

- Sanitize user input and enforce storage validation.

Scope

- Add a shared sanitize helper for user-entered text.
- Ensure any reflected input is escaped.
- Enforce validation functions in storage load paths.
- Hide stack traces in production error UI.

Acceptance criteria

- User input is not inserted into the DOM as raw HTML.
- Storage reads validate shape before use.
- Error UI shows stack traces only in dev.
