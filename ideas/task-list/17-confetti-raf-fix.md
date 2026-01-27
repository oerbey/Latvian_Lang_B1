# Task 17 - Confetti render loop fix

Source: ideas/architectural-review-2026/06-performance-optimization.md

Goal

- Prevent confetti render loops from leaking frames or memory.

Scope

- Track requestAnimationFrame IDs in render.js.
- Reuse arrays rather than filter on every frame.
- Cancel RAFs when animation ends.

Acceptance criteria

- Confetti animation stops cleanly.
- No growth in active RAFs after repeated triggers.
