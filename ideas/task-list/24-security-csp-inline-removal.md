# Task 24 - Remove inline scripts and tighten CSP

Source: ideas/architectural-review-2026/09-security-considerations.md

Goal
- Remove inline scripts so CSP can drop unsafe-inline for scripts.

Scope
- Move inline scripts (footer year, game card generation) into external modules.
- Update CSP meta tag to remove unsafe-inline from script-src.
- Keep runtime behavior unchanged.

Acceptance criteria
- No inline script blocks remain in HTML files.
- CSP no longer includes unsafe-inline for scripts.
