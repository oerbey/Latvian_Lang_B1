# Task 32 - Pre-commit hooks and formatting scripts

Source: ideas/architectural-review-2026/07-platform-and-tooling.md

Goal
- Add automated formatting and lint checks before commits.

Scope
- Add format and format:check npm scripts.
- Add husky and lint-staged configuration.
- Run ESLint and Prettier on staged files.

Acceptance criteria
- Developers can run npm run format and npm run format:check.
- Pre-commit hook runs on staged JS and JSON files.
