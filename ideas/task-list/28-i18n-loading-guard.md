# Task 28 - i18n loading guard

Source: ideas/architectural-review-2026/12-internationalization.md

Goal

- Prevent visible text from flashing before translations load.

Scope

- Add a class on body during i18n loading.
- Hide elements with data-i18n-key until strings are applied.
- Remove the class after load.

Acceptance criteria

- No translation flash on page load.
- Pages remain visible once strings are applied.
