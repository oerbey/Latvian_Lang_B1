# Task 33 - Type checking and JSDoc

Source: ideas/architectural-review-2026/07-platform-and-tooling.md

Goal

- Introduce light type checking for core modules.

Scope

- Enable checkJs in jsconfig.json (or add a separate tsconfig for checks).
- Add JSDoc annotations to core lib modules (state, storage, utils).
- Add a typecheck script if needed.

Acceptance criteria

- Type checking runs without errors on core modules.
- JSDoc improves editor intellisense.
