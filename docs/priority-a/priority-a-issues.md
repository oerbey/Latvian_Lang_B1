# Priority A Issue Backlog (Priority A Roadmap)

## Issue 1 — Implement Dexie Storage & SRS Scheduler
- **Labels**: `feature`, `priority:a`, `area:srs`, `local-first`
- **Estimate**: Medium
- **Suggested Branch**: `feature/srs`
- **PR Title Template**: `feat(srs): add Dexie schema and scheduler`
- **Suggested Reviewers**: _(assign core frontend maintainer)_

### Description
Stand up the local data layer for Priority A features. Add Dexie schema definitions, initialization helpers, migrations scaffolding, and the SM-2 based scheduler with unit tests. Seed the database with sample data derived from `data/words.json` and expose APIs to fetch due items.

### Acceptance Criteria
- Dexie database initializes with `srs_items`, `srs_history`, `user_profile`, `pronunciation_sessions`, and `media_blobs` tables.
- Scheduler function returns expected output for provided grade vectors; unit tests (≥12 cases) pass under Vitest.
- Queue builder prototype can fetch due cards ordered by `nextReview`.
- Documentation (`docs/priority-a/priority-a-design.md`) linked from repo README or docs index.

---

## Issue 2 — Review Mode UI with Keyboard Accessibility
- **Labels**: `feature`, `priority:a`, `area:ui`, `accessibility`
- **Estimate**: Large
- **Suggested Branch**: `feature/review-ui`
- **PR Title Template**: `feat(review): add review mode interface`
- **Suggested Reviewers**: _(UI specialist, accessibility champion)_

### Description
Create `review.html` entry point and implement the review session UI described in the design doc. Include keyboard shortcuts, TTS trigger, progress display, and integration with the scheduler/queue. Ensure responsive layout for desktop and mobile.

### Acceptance Criteria
- Users can grade cards with mouse or keys `1/2/3/4`; focus order and `aria-live` announcements verified with axe-core.
- Queue prioritizes due cards, enforces daily new limit, and updates after each grade.
- Session summary screen displays counts and links to dashboard/backup.
- TTS button plays Latvian audio (graceful fallback when voice unavailable).
- axe accessibility test passes with no critical violations.

---

## Issue 3 — Backup, Restore, and Data Controls
- **Labels**: `feature`, `priority:a`, `area:storage`, `privacy`
- **Estimate**: Medium
- **Suggested Branch**: `feature/backup-restore`
- **PR Title Template**: `feat(storage): add backup and restore workflows`
- **Suggested Reviewers**: _(privacy minded reviewer)_

### Description
Add UI and logic to export/import user data. Surface controls in Settings, implement validation and conflict preview, and wire retention cleanup for audio blobs. Ensure flows meet privacy requirements.

### Acceptance Criteria
- Export produces JSON matching schema in design doc; file downloads successfully.
- Import validates version, shows summary (new/updated/conflicts), and allows merge or overwrite.
- Audio retention cleanup removes expired `media_blobs` on app load.
- Settings screen includes toggle for `syncEnabled` and `audioUploadConsent` with explanatory copy.
- Unit/integration tests cover export/import success and failure paths.

---

## Issue 4 — Dashboard Visualizations
- **Labels**: `feature`, `priority:a`, `area:dashboard`, `analytics`
- **Estimate**: Large
- **Suggested Branch**: `feature/dashboard`
- **PR Title Template**: `feat(dashboard): add charts and data pipeline`
- **Suggested Reviewers**: _(data viz knowledgeable reviewer)_

### Description
Implement `dashboard.html` entry point, Dexie aggregation utilities, and Chart.js visualizations (KPI tiles, mastery heatmap, review load forecast, accuracy trend, time-spent donut). Ensure mobile responsiveness and accessibility.

### Acceptance Criteria
- Charts render using real Dexie data; dynamic filters update datasets without reload.
- Heatmap provides accessible table fallback and tooltips reflect accuracy percentages.
- Lazy-loaded Chart.js keeps initial bundle under target size; service worker caches dashboard assets.
- Playwright dashboard test passes; no console errors during interactions.

---

## Issue 5 — Pronunciation Practice Flow
- **Labels**: `feature`, `priority:a`, `area:audio`, `privacy`
- **Estimate**: Large
- **Suggested Branch**: `feature/pronunciation`
- **PR Title Template**: `feat(pronunciation): add practice modal and local scoring`
- **Suggested Reviewers**: _(audio specialist, privacy reviewer)_

### Description
Build the pronunciation modal/page with consent flow, TTS playback, MediaRecorder integration, local scoring heuristics, and session logging. Provide fallback UI when APIs are unavailable and ensure feedback states match design doc.

### Acceptance Criteria
- Consent modal gates any audio capture and clearly states retention/policy.
- Recording works on Chrome, Edge, Firefox (desktop/mobile) under manual QA matrix.
- Local feedback displays confidence percent, diff highlights, and allows retry/save/delete.
- Pronunciation sessions are stored in Dexie; data appears in dashboard time-spent metrics.
- Accessibility test verifies keyboard control and announcements.

---

## Issue 6 — Optional Supabase Sync & Whisper Integration
- **Labels**: `feature`, `priority:a`, `area:sync`, `optional`
- **Estimate**: Medium
- **Suggested Branch**: `feature/sync-supabase`
- **PR Title Template**: `feat(sync): integrate optional supabase sync and whisper fallback`
- **Suggested Reviewers**: _(backend/cloud reviewer)_

### Description
Implement feature-flagged Supabase sync per contract. Add auth bootstrap (email magic link or anonymous key), push/pull flows, conflict handling, and Whisper ASR fallback using Supabase Edge function. Ensure opt-in UI and background sync queue.

### Acceptance Criteria
- Sync disabled by default; enabling requires user confirmation.
- Manual “Sync now” executes push/pull, updates `lastSync`, and resolves conflicts deterministically.
- Whisper upload occurs only when consented, with status feedback and retry handling.
- Offline scenarios are resilient (queued sync attempts, no crashes).
- Integration tests mock Supabase responses; Playwright scenario covers opt-in/out.

---

## Issue 7 — Automated Tests & CI Hardening
- **Labels**: `feature`, `priority:a`, `area:testing`, `ci`
- **Estimate**: Medium
- **Suggested Branch**: `feature/tests-ci`
- **PR Title Template**: `chore(ci): add test suites and github actions`
- **Suggested Reviewers**: _(QA/DevOps reviewer)_

### Description
Add Vitest unit/integration suites, Playwright E2E scaffolding, axe accessibility checks, and GitHub Actions workflow defined in design doc. Ensure scripts run locally and in CI with deterministic fixtures.

### Acceptance Criteria
- `npm run test:unit`, `test:integration`, `test:e2e`, and `test:a11y` commands exist and pass using seeded data.
- Playwright tests run headless in CI with mocked media/IndexedDB fixtures.
- GitHub Actions workflow executes lint/test/build/deploy steps; failing tests block merge.
- README/CONTRIBUTING updated with testing instructions and CI badge.

---
