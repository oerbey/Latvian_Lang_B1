# Task 30 - Pluralization and formatting helpers

Source: ideas/architectural-review-2026/12-internationalization.md

Goal

- Provide consistent pluralization and date/number formatting.

Scope

- Add a helper that uses Intl.PluralRules and Intl.DateTimeFormat.
- Update at least one game to use the helper for counts.

Acceptance criteria

- Pluralized strings are correct for en and lv.
- Date and number formatting uses Intl helpers consistently.
