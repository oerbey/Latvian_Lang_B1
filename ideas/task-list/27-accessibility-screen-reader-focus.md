# Task 27 - Screen reader updates and focus management

Source: ideas/architectural-review-2026/10-accessibility.md

Goal
- Improve screen reader announcements and focus handling.

Scope
- Ensure sr-game-state announcements are updated reliably.
- Add focus trapping and restore focus for overlays (help, error, modal).
- Add missing aria-labels and input labels where needed.

Acceptance criteria
- Screen reader announcements fire for key game events.
- Overlays trap focus and restore on close.
- Interactive elements have accessible labels.
