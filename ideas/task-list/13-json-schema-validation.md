# Task 13 - JSON schema validation

Source: ideas/architectural-review-2026/05-data-modeling.md

Goal

- Validate data files against JSON schemas during data builds.

Scope

- Add schema files for core data sets (words, items, routes, duties).
- Add a validation script using Ajv or similar.
- Wire validation into npm scripts or CI.

Acceptance criteria

- Invalid data fails validation with clear errors.
- Validation runs in a standard script (manual or CI).
