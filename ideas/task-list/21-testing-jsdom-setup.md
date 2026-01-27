# Task 21 - JSDOM setup and test helpers

Source: ideas/architectural-review-2026/08-testing-strategy.md

Goal

- Add a shared JSDOM setup so DOM-related tests can run in Node.

Scope

- Create a test setup module that registers JSDOM globals.
- Add mock helpers for localStorage and fetch.
- Update npm test script to include the setup file.

Acceptance criteria

- DOM-dependent unit tests can run without manual setup in each test file.
- Existing tests keep passing.
