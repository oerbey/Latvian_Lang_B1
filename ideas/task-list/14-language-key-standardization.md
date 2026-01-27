# Task 14 - Standardize language keys

Source: ideas/architectural-review-2026/05-data-modeling.md

Goal

- Use consistent language keys across data and i18n.

Scope

- Standardize on lv, en, ru in data files and loaders.
- Update consumers that still expect eng or other variants.
- Add a small migration or fallback for older keys if needed.

Acceptance criteria

- Data loaders accept only lv, en, ru without special cases.
- No runtime errors from missing translation fields.
