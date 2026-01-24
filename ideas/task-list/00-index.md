# Task List - Architectural Review 2026

Use one task file at a time. Each task is scoped to a clear change set so an AI agent can pick a file and implement it.

1) ✅ 01-game-init-error-handling.md - Wrap game initialization and top-level awaits with error handling
2) ✅ 02-travel-tracker-loadjson-shadow.md - Remove loadJSON shadowing in travel-tracker
3) ✅ 03-game-base-helper.md - Add a shared GameBase helper for common lifecycle work
4) ✅ 04-migrate-one-game-to-game-base.md - Migrate one pilot game to GameBase
5) ✅ 05-split-travel-tracker-module.md - Split travel-tracker into smaller modules
6) ✅ 06-split-endings-builder-module.md - Split endings-builder into smaller modules
7) ✅ 07-split-other-large-modules.md - Split duty-dispatcher, decl6-detective, passive-lab, matching-game
8) ✅ 08-state-store-refactor.md - Replace global mutable state with a store pattern
9) ✅ 09-state-dom-decoupling.md - Remove DOM writes from state and move clickables to render context
10) ✅ 10-shared-navigation.md - Generate navbar and footer from a shared source
11) ✅ 11-game-loading-and-error-states.md - Add consistent loading and error UI per game
12) ✅ 12-touch-target-audit.md - Enforce 48px touch targets across UI
13) ✅ 13-json-schema-validation.md - Add JSON schema validation for data files
14) ✅ 14-language-key-standardization.md - Standardize language keys in data and loaders
15) ✅ 15-words-json-split-and-loader.md - Split words.json and update loaders
16) ✅ 16-progress-schema-unification.md - Unify progress storage schema and migrations
17) ✅ 17-confetti-raf-fix.md - Fix confetti render loop and cancel RAFs
18) ✅ 18-redraw-throttling.md - Throttle canvas redraws and support dirty regions
19) 19-pwa-icons-manifest.md - Add PWA icons and update manifest and HTML
20) 20-sw-cache-expansion.md - Expand SW cache or add dynamic caching for game assets
21) 21-testing-jsdom-setup.md - Add JSDOM setup and test helpers
22) 22-testing-coverage.md - Add coverage reporting
23) 23-testing-playwright-e2e.md - Add Playwright E2E smoke tests
24) 24-security-csp-inline-removal.md - Remove inline scripts and tighten CSP
25) 25-security-input-sanitization.md - Sanitize user input and enforce storage validation
26) 26-accessibility-skip-links.md - Add skip links on all pages
27) 27-accessibility-screen-reader-focus.md - Improve screen reader updates and focus management
28) 28-i18n-loading-guard.md - Prevent translation flash before strings load
29) 29-i18n-merge-validation.md - Merge i18n files and add validation
30) 30-i18n-pluralization-formatting.md - Add pluralization and consistent formatting helpers
31) 31-tooling-build-consolidation.md - Port Python data build to Node
32) 32-tooling-precommit-format.md - Add pre-commit hooks and formatting scripts
33) 33-tooling-typecheck-jsdoc.md - Enable type checking and add JSDoc to core modules
34) 34-offline-indicator.md - Add offline banner and styles
