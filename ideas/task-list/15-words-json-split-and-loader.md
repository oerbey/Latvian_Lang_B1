# Task 15 - Split words.json and update loaders

Source: ideas/architectural-review-2026/05-data-modeling.md

Goal
- Reduce large single-file data loads by splitting words.json.

Scope
- Create an index file that lists word chunks.
- Update data loading logic to fetch chunks on demand.
- Keep existing game behavior identical.

Acceptance criteria
- Data loads correctly with the new chunked structure.
- Initial load size is smaller or more targeted.
