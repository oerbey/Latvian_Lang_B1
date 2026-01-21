# Task 20 - Service worker cache expansion

Source: ideas/architectural-review-2026/11-mobile-pwa.md

Goal
- Ensure key game pages and data are available offline.

Scope
- Add missing game pages and key data files to the SW cache list, or implement dynamic caching for JSON and assets.
- Keep GitHub Pages-safe relative paths.

Acceptance criteria
- Offline refresh works for multiple game pages already visited.
- No absolute path usage in SW cache lists.
