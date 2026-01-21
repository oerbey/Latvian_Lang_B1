# Task 18 - Redraw throttling

Source: ideas/architectural-review-2026/06-performance-optimization.md

Goal
- Avoid full canvas redraws on every state change.

Scope
- Add a scheduling layer to coalesce redraws using requestAnimationFrame.
- Optionally implement dirty region tracking for partial redraws.
- Keep visual output unchanged.

Acceptance criteria
- Redraw calls are throttled to animation frames.
- No visible regression in rendering output.
