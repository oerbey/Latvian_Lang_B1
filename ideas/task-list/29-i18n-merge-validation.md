# Task 29 - Merge i18n files and add validation

Source: ideas/architectural-review-2026/12-internationalization.md

Goal
- Reduce duplicated translations and validate coverage.

Scope
- Merge per-game translation files into per-language files with namespaces.
- Update loaders to use the new structure.
- Add a validation script to report missing or extra keys.

Acceptance criteria
- All languages load from a single file per language.
- Validation script reports missing keys and exits non-zero on error.
