# Task 31 - Consolidate data build scripts

Source: ideas/architectural-review-2026/07-platform-and-tooling.md

Goal

- Remove Python dependency for data builds by porting scripts to Node.

Scope

- Port scripts/build_week1_offline.py to a Node module.
- Add a single build-all script that runs data conversions.
- Update package.json scripts accordingly.

Acceptance criteria

- All data builds run with Node only.
- No Python dependency required for normal development.
