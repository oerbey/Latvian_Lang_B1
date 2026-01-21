# Task 09 - Decouple DOM from state and move clickables

Source: ideas/architectural-review-2026/03-state-management.md

Goal
- Remove DOM writes from state.js and move clickables to render context.

Scope
- Replace setStatus in state.js with a callback pattern or events.
- Move clickables and hit testing into render.js or a dedicated module.
- Update app.js to wire DOM updates.

Acceptance criteria
- state.js contains no direct DOM access.
- Clickable region management is no longer stored in state.js.
- Hit testing still works as before.
