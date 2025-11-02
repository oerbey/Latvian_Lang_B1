# Priority A Roadmap — Latvian_Lang_B1

## 1. Vision & Objectives
- Deliver a local-first Latvian vocabulary trainer that personalizes review cadence, supports pronunciation practice, and surfaces clear learning analytics while remaining compatible with GitHub Pages.
- Preserve the existing static ES-module architecture and keep bundle size lightweight by leaning on native browser APIs plus a small, justified dependency set (Dexie.js, Chart.js, optional Workbox enhancements).
- Ensure all new features respect privacy: no cloud persistence or audio upload without explicit, revocable user consent.
- Provide an implementation blueprint that enables incremental delivery (MVP → enhancements) with verifiable acceptance criteria and automated test coverage.

### Success Metrics
- Learners can review due cards with a four-grade SRS, and the system schedules the next review locally even when offline.
- IndexedDB (Dexie) stores per-word accuracy, streaks, and history; users can export/import their progress.
- Pronunciation flow allows text-to-speech playback, recording, local feedback, and optional Whisper/Supabase-backed analysis when opted in.
- Dashboard visualizations summarize accuracy trends, review load, and streaks across the last 30 days.

## 2. Architecture Overview
### 2.1 System Context
- **Client-only baseline**: Static HTML + ES modules delivered via GitHub Pages. New pages (`review.html`, `dashboard.html`) are pre-rendered and enhanced at runtime. Existing `sw.js` handles offline caching; we will extend it prudently.
- **Local data layer**: Dexie (IndexedDB wrapper) orchestrates persistent storage. The app loads initial vocabulary (`data/words.json`) and merges with local review state.
- **Optional cloud tier**: Supabase (Postgres + Auth) provides sync endpoints guarded by feature flag `syncEnabled`. The system must degrade gracefully when network or authentication is unavailable.
- **Audio processing**: Web Speech API handles TTS; MediaRecorder + Web Audio API manage capture/playback. Optional ASR requests are queued to the backend only after consent.

### 2.2 Core Data Flow
1. **Initialization**: When a user visits `review.html`, bootstrap script hydrates Dexie, loads user profile/settings, and builds a review queue.
2. **Review session**: The queue presents due cards first, followed by new words capped by a daily limit. User grading invokes the SRS scheduler, producing updated `srs_items` and appending a record to `srs_history`.
3. **Pronunciation practice**: Triggered from review card or dedicated modal. Local scoring compares phoneme tokens (Text-to-Phoneme library or simple transcript heuristics). If optional ASR is enabled, audio chunks are uploaded for Whisper transcription and merged back into history.
4. **Dashboard**: `dashboard.html` queries Dexie for aggregates (accuracy trends, review load) and renders charts via Chart.js. Data updates via Dexie live queries or explicit refresh.
5. **Sync (optional)**: When `syncEnabled` is true, sync orchestrator pushes new history records and pulls remote updates since `lastSync`. Conflict resolution merges histories and recalculates derived SRS fields client-side.

### 2.3 Component Interaction
- `src/storage/db.js` exposes Dexie instance and typed table accessors.
- `src/srs/scheduler.js` receives grade events and returns next review metadata.
- `src/srs/queue.js` builds prioritized review sequences based on Dexie queries and app settings.
- `src/ui/review/index.js` coordinates queue consumption, TTS triggers, grading UI, and writes back to storage.
- `src/pronunciation/*` modules encapsulate audio capture, scoring, and consent gating. They integrate with review UI and can surface standalone practice sessions.
- `src/ui/dashboard/*` modules compute aggregates and render charts. They subscribe to Dexie data via `liveQuery` where appropriate.
- `src/sync/*` modules encapsulate optional Supabase interactions. Feature flagging occurs in `src/state.js` and `user_profile.settings`.

## 3. Planned Modules & File Map
| Path | Responsibility | Notes / Inputs | Outputs / Consumers |
| --- | --- | --- | --- |
| `review.html` | Static entry point that mounts review mode UI | Loads `src/ui/review/index.js` | Browser |
| `dashboard.html` | Static entry for analytics | Loads `src/ui/dashboard/index.js` | Browser |
| `src/storage/db.js` | Create Dexie instance, define schema versions, expose typed tables | Imports Dexie, `storage/constants.js` | Returns `db`, helper methods |
| `src/storage/constants.js` | Centralize table names, version numbers | Versioned schema metadata | Used by storage modules/tests |
| `src/storage/export.js` | Serialize tables into exportable JSON | `db`, serialization helpers | `Blob`/JSON for download |
| `src/storage/import.js` | Validate and import backup JSON, preview conflicts | JSON import, Dexie transaction | Promise with import summary |
| `src/storage/migrations.js` | Handle Dexie schema upgrades | Dexie version hooks | Migration functions |
| `src/srs/scheduler.js` | SM-2 variant implementation, next review computation | Card state, grade | Updated interval/ease/nextReview |
| `src/srs/queue.js` | Build and manage review queue | `db`, scheduler, settings | Queue API (`getNext`, `peek`, `seed`) |
| `src/srs/metrics.js` | Compute accuracy and streak stats | `srs_history` data | Stats for dashboard/header |
| `src/ui/review/index.js` | Bootstrap review page, render queue, handle grading | `queue`, `scheduler`, DOM templates | UI updates, writes to storage |
| `src/ui/review/template.html` | HTML partial for review card layout | Loaded via fetch or inline | Provides markup |
| `src/ui/review/keyboard.js` | Keyboard shortcut handling & focus management | DOM elements | Event bindings used by `index.js` |
| `src/ui/review-mode.md` | Wireframes & interaction spec (generated from this doc) | N/A | Developer reference |
| `src/pronunciation/index.js` | Public API to launch practice modal | Recorder, scorer modules | Executes flow |
| `src/pronunciation/audio.js` | TTS playback, audio asset caching | Web Speech API | Audio controls |
| `src/pronunciation/recorder.js` | MediaRecorder wrapper, fallback detection | Media devices | Audio blobs, waveforms |
| `src/pronunciation/scoring.js` | Local pronunciation scoring heuristics | Recorder output, expected text | Confidence score, diff |
| `src/pronunciation/consent.js` | Consent UI + persistence | user_profile settings | Booleans controlling uploads |
| `src/ui/pronunciation.md` | Wireframe/state flows | N/A | Developer reference |
| `src/ui/dashboard/index.js` | Render dashboard shell, manage filters | Chart modules, data fetch | DOM updates |
| `src/ui/dashboard/charts.js` | Chart.js wrappers for required visuals | Chart.js, aggregated data | Chart instances |
| `src/ui/dashboard/data.js` | Dexie queries + data shaping | `db`, metrics helper | Data series for charts |
| `src/ui/dashboard.md` | Wireframes & layout spec | N/A | Developer reference |
| `src/sync/supabase-config.js` | Feature flag + Supabase client bootstrap | Supabase URL/key (if provided) | Supabase client or null |
| `src/sync/strategy.js` | Sync orchestration, conflict resolution | Dexie tables, config | Sync report |
| `src/sync/payloads.js` | Serialize/deserialize payloads for API | Table records | HTTP requests |
| `src/sync/supabase.md` | Sync protocol reference | N/A | Developer reference |
| `src/workers/audio-processor.js` | Optional Web Worker for waveform analysis | Audio data | Processed metrics |
| `sw.js` (existing) | Extend to precache new pages/assets & background sync hints | Workbox or manual update | Offline support |
| `scripts/page-init.js` (existing) | Update to register new pages/feature flags | feature toggles | Bootstraps UI |
| `test/specs/srs.test.js` | Unit tests for scheduler vectors | `scheduler.js` | Vitest |
| `test/specs/storage.test.js` | Dexie operations & backup/restore | `db.js`, `export/import` | Vitest |
| `test/specs/review-flow.test.js` | Integration tests simulating sessions | `queue`, `storage` | Vitest w/ jsdom |
| `test/e2e/review.spec.ts` | Playwright scenario for review mode | Deployed app | CI smoke |
| `test/e2e/dashboard.spec.ts` | Playwright scenario for dashboard | Deployed app | CI smoke |
| `test/e2e/pronunciation.spec.ts` | Mocked microphone flow | Playwright | CI smoke |
| `test/accessibility/review.axe.test.js` | axe-core accessibility regression | Review UI | CI gating |

## 4. Storage Architecture (Dexie)
### 4.1 Schema Definition
```js
// docs reference only — do not ship verbatim without validation.
import Dexie from 'dexie';

export const DB_VERSION = 1;

export function initDb() {
  const db = new Dexie('latvian_b1');
  db.version(DB_VERSION).stores({
    srs_items: '&wordId,nextReview,interval,ease,repetition,accuracy,lastReview,status,tags',
    srs_history: '++historyId,wordId,timestamp,grade,responseTime,source,[wordId+timestamp]',
    user_profile: '&id,createdAt,lastSync,[settings.syncEnabled],streakCurrent,streakMax',
    pronunciation_sessions: '++sessionId,wordId,createdAt,confidence,mode,cloudUploaded',
    media_blobs: '++blobId,sessionId,wordId,createdAt,type,sha,expiresAt'
  });
  return db;
}
```
- `status` in `srs_items` distinguishes `learning`, `review`, `suspended`.
- `tags` caches topic/unit references for dashboard filters.
- `pronunciation_sessions` stores local scoring metadata regardless of cloud usage.
- `media_blobs` retains short-lived audio chunks (up to retention policy) so users can re-listen or retry; `expiresAt` enforces auto-prune.

### 4.2 Example Records
```json
{
  "srs_items": [
    {
      "wordId": "lv_amar",
      "nextReview": "2024-05-18T08:00:00.000Z",
      "interval": 3,
      "ease": 2.40,
      "repetition": 3,
      "accuracy": 0.78,
      "lastReview": "2024-05-15T07:55:12.000Z",
      "status": "review",
      "tags": ["verbs", "prefix", "unit4"],
      "historyIds": [1201, 1188, 1176]
    },
    {
      "wordId": "lv_pilseta",
      "nextReview": "2024-05-15T20:00:00.000Z",
      "interval": 0,
      "ease": 2.50,
      "repetition": 0,
      "accuracy": null,
      "lastReview": null,
      "status": "new",
      "tags": ["nouns", "travel"],
      "historyIds": []
    }
  ],
  "srs_history": [
    {
      "historyId": 1201,
      "wordId": "lv_amar",
      "timestamp": "2024-05-15T07:55:12.000Z",
      "grade": 4,
      "responseTime": 5.2,
      "source": "review",
      "sessionId": "sess_20240515_1",
      "gameContext": "review"
    },
    {
      "historyId": 1202,
      "wordId": "lv_amar",
      "timestamp": "2024-05-10T06:10:22.000Z",
      "grade": 3,
      "responseTime": 7.1,
      "source": "review",
      "sessionId": "sess_20240510_1",
      "gameContext": "match"
    }
  ],
  "user_profile": [
    {
      "id": "local",
      "createdAt": "2024-05-12T11:32:00.000Z",
      "lastSync": null,
      "settings": {
        "dailyNewLimit": 10,
        "syncEnabled": false,
        "audioUploadConsent": false,
        "locale": "en",
        "ttsVoice": "lv-LV",
        "reviewIntervalCapDays": 45
      },
      "streakCurrent": 4,
      "streakMax": 7,
      "achievements": {
        "lastReviewDate": "2024-05-15",
        "totalReviews": 132
      }
    }
  ],
  "pronunciation_sessions": [
    {
      "sessionId": 501,
      "wordId": "lv_amar",
      "createdAt": "2024-05-15T07:57:30.000Z",
      "confidence": 0.68,
      "mode": "local",
      "cloudUploaded": false,
      "feedback": {
        "diff": ["ā", "r"],
        "transcript": "amar"
      }
    }
  ]
}
```

### 4.3 Backup & Restore JSON Shape
```json
{
  "meta": {
    "exportedAt": "2024-05-15T08:05:00.000Z",
    "appVersion": "1.4.0",
    "dbVersion": 1
  },
  "user_profile": [...],
  "srs_items": [...],
  "srs_history": [...],
  "pronunciation_sessions": [...],
  "media_blobs": [
    {
      "blobId": 110,
      "wordId": "lv_amar",
      "sessionId": 501,
      "sha": "sha256-b64",
      "createdAt": "2024-05-15T07:57:29.000Z",
      "type": "audio/webm",
      "expiresAt": "2024-06-14T00:00:00.000Z",
      "data": "base64..."
    }
  ]
}
```
- Import flow validates schema version, displays counts/duplicates, previews conflicting `wordId`s, and offers merge or replace.
- Export UI surfaces `Download JSON` and `Copy to clipboard` options with explicit privacy reminder.

## 5. SRS Algorithm Specification (SM-2 Variant)
### 5.1 Rationale
- SM-2 is well-understood, lightweight, and sufficient for B1 vocabulary practice. We adapt it to four-grade scale (`Again`, `Hard`, `Good`, `Easy`) and cap maximum intervals per user setting (default 45 days).
- Ease factor floor set to 1.3 to avoid excessively frequent reviews, ceiling 2.6 to prevent runaway intervals.

### 5.2 Pseudo-code
```js
const GRADES = { AGAIN: 0, HARD: 3, GOOD: 4, EASY: 5 };

function scheduleReview(card, grade, reviewTime = new Date()) {
  const MIN_EASE = 1.3;
  const MAX_INTERVAL = card.settings?.intervalCapDays ?? 60;
  const next = { ...card };

  if (grade === GRADES.AGAIN) {
    next.repetition = 0;
    next.interval = 0;
    next.ease = Math.max(MIN_EASE, card.ease - 0.2);
    next.nextReview = addMinutes(reviewTime, card.settings?.learningSteps?.[0] ?? 10);
    next.status = 'learning';
  } else {
    if (card.repetition === 0) {
      next.interval = (grade === GRADES.HARD) ? 1 : 1;
    } else if (card.repetition === 1) {
      next.interval = (grade === GRADES.HARD) ? 3 : 4;
    } else {
      const easeAdjustment = grade === GRADES.HARD ? -0.15 : grade === GRADES.GOOD ? 0 : 0.15;
      next.ease = Math.max(MIN_EASE, Math.min(2.6, card.ease + easeAdjustment));
      const multiplier = grade === GRADES.HARD ? 1.2 : grade === GRADES.GOOD ? next.ease : next.ease * 1.3;
      next.interval = Math.round(Math.min(MAX_INTERVAL, card.interval * multiplier));
    }
    next.repetition = card.repetition + 1;
    next.status = 'review';
    next.nextReview = addDays(reviewTime, Math.max(1, next.interval));
  }

  next.lastReview = reviewTime.toISOString();
  next.accuracy = computeRollingAccuracy(card.accuracy, grade);
  return next;
}
```
- `computeRollingAccuracy` applies exponential moving average weighting (default α=0.2) to emphasize recent performance.
- `learningSteps` defaults to `[10, 60]` minutes; `Again` resets to the first learning step.

### 5.3 Test Vectors (subset)
| Case | Input (`interval`, `ease`, `repetition`, `grade`) | Output (`nextReview`, `interval`, `ease`, `status`) |
| --- | --- | --- |
| New Good | `0, 2.5, 0, GOOD` at `2024-05-15` | nextReview: `2024-05-16`, interval: `1`, ease: `2.5`, status: `review` |
| New Again | `0, 2.5, 0, AGAIN` | nextReview: `2024-05-15T00:10Z`, interval: `0`, ease: `2.3`, status: `learning` |
| Mature Hard | `12, 2.3, 4, HARD` | nextReview: `2024-05-29`, interval: `14`, ease: `2.15`, status: `review` |
| Mature Good | `14, 2.2, 5, GOOD` | nextReview: `2024-06-12`, interval: `28`, ease: `2.2`, status: `review` |
| Mature Easy | `20, 2.4, 6, EASY` | nextReview: `2024-07-13`, interval: `35` (capped if needed), ease: `2.55`, status: `review` |
| Lapse Again | `30, 2.5, 8, AGAIN` | nextReview: `2024-05-15T01:10Z`, interval: `0`, ease: `2.3`, status: `learning` |

### 5.4 Edge Case Handling
- **Long absence**: When the actual review time exceeds `nextReview` by >2× interval, scheduler applies `catch-up` logic by lowering ease by 0.15 and resetting repetition if grade `Again`.
- **New word injection**: Daily cap prevents overwhelming queue; new card `status` stays `learning` until two consecutive non-Again grades.
- **Interval cap**: Configurable per user; when hit, scheduler still increments repetition but interval stays at cap.

## 6. UI / UX Specifications
### 6.1 Review Mode
- **Queue rules**: Load all due cards ordered by `nextReview`, then fill with new cards up to `dailyNewLimit`, preferring words tagged with current unit selection. Rebuild queue after every grade event.
- **Layout (desktop)**:
```
┌───────────────────────────────────────────────────────────────┐
│ Header: Due now • New today • Streak badge                    │
│ Progress bar: [■■■■□□□□□□] 17 / 30                           │
├───────────────────────────────────────────────────────────────┤
│ Prompt row: Latvian word (oversized)    [🔊 Play] [Practice]  │
│ Subtext: Translation toggle • Example sentence (if available)│
│ Mnemonic panel (expandable)                                    │
│                                                               │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────┐│
│ │1 Again       │  │2 Hard        │  │3 Good        │  │4 Easy││
│ │“I forgot it” │  │“Hesitant”    │  │“Solid recall”│  │“Effortless” ││
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────┘│
│ Shortcut legend + Timer + Accessibility live region           │
└───────────────────────────────────────────────────────────────┘
```
- **Mobile adjustments**: Buttons stacked 2×2; header collapses into chips; TTS icon anchored near word. Swipe left/right optionally maps to previous/skip (non-destructive).
- **Keyboard**: `1/2/3/4` map to grade, `Space` toggles TTS, `P` opens pronunciation modal, arrow keys cycle word details. Focus order respects DOM reading order; visually hidden `<div aria-live="polite">` announces grade confirmation and remaining count.
- **Session metrics**: Show `Due`, `New`, `Remaining`, `Time spent this session`. Provide “Session complete” screen with summary and CTA to dashboard.
- **Export/Import**: Settings menu includes `Backup & Restore` with explicit instructions, file picker, validation summary (counts, duplicates).
- **Accessibility**: High-contrast theme inherits existing design tokens; ensure buttons meet WCAG AA (≥4.5:1). Focus ring always visible.

### 6.2 Pronunciation Practice
- **Flow**:
  1. User presses `Practice` in review card or opens `/pronunciation.html`.
  2. Consent modal (first run or when uploading enabled) explains microphone usage, local scoring, optional cloud upload. Requires checkbox before continuing.
  3. TTS playback of target word + example sentence (if available). Provide voice selector fallback list.
  4. Recording state: countdown (3→1) then capture up to 5 seconds; waveform thumbnail shown using Canvas.
  5. Local scoring compares speech to expected phoneme string (via simple rule-based diff). Feedback states `Great`, `Almost`, `Try again` with highlighted syllables.
  6. If cloud ASR enabled and user opts to submit, audio blob is uploaded, server returns transcript + confidence, UI merges into feedback panel.
  7. User can retry, save attempt (persists `pronunciation_sessions`), or delete recording (removes blob + metadata).
- **States**: `idle`, `recording`, `processing_local`, `awaiting_server`, `feedback`, `error`. UI transitions announced via `aria-live`.
- **Fallbacks**: If `navigator.mediaDevices` unavailable, show message with manual transcription input for user to self-assess. If Speech Synthesis voice missing, fall back to textual prompt.
- **Mobile**: Full-screen modal, big record button, haptic feedback suggestion.

### 6.3 Progress Dashboard
- **Layout**:
```
┌─────────────────────────────────────────────┐
│ Filters: Time range (7/30/90 days), Unit,   │
│           Mode (review/match/sprint)        │
├─────────────────────────────────────────────┤
│ KPI tiles:                                  │
│  - Current streak / Max streak              │
│  - Reviews completed this week              │
│  - Accuracy 30-day avg                      │
├─────────────────────────────────────────────┤
│ Row 1: Heatmap (Unit vs Accuracy %)         │
│ Row 2: Review load forecast (Due items/day) │
│ Row 3: Accuracy over time (line chart) +    │
│         Time spent donut                    │
└─────────────────────────────────────────────┘
```
- **Charts**:
  - *Mastery heatmap* (Chart.js matrix plugin or custom canvas): X-axis units/topics, Y-axis conjugation tense/case; cell color from accuracy average. Data from `srs_items.tags` + `srs_history`.
  - *Review load forecast* (stacked bar): Query `srs_items` by `nextReview` → group by due date next 14 days.
  - *Accuracy over time* (line): Rolling 7-day average accuracy from `srs_history`.
  - *Time spent* (donut): Aggregate `responseTime` per game context.
- **Interactions**: Hover tooltips show counts; clicking heatmap cell filters other charts to that unit. Provide “Export CSV” for analytics.
- **Mobile**: Charts stack vertically; filters collapse into accordion.
- **Accessibility**: `role="img"` with descriptive `aria-label`s, and data tables toggled for screen readers.

## 7. Pronunciation & Audio Architecture
- **TTS**: Use `speechSynthesis.speak` with `lang="lv-LV"`. Provide voice selection derived from available voices; persist in `user_profile.settings.ttsVoice`.
- **Recording**: `MediaRecorder` capturing `audio/webm;codecs=opus` at 48kHz. If not supported, display fallback instructions.
- **Local scoring**: Convert expected phrase to IPA-like tokens using simplified mapping; compare with transcript from `webkitSpeechRecognition` when available or naive energy-based detection. Provide hooking for third-party library later.
- **Optional ASR**: When consented, queue POST to Supabase Edge function `/rpc/analyze_pronunciation` (see Section 8). Include hashed device ID (from user profile) and ephemeral signed URL for audio blob. Implement exponential backoff and offline queue using Service Worker Background Sync.
- **Storage**: Keep recent audio (30 days) in `media_blobs`; nightly cleanup job (on app load) purges expired entries.

## 8. Optional Cloud Sync (Supabase) Contract
### 8.1 Tables (SQL Outline)
```sql
-- Supabase Postgres schema blueprint
create table public.users (
  id uuid primary key,
  created_at timestamptz default now(),
  locale text,
  audio_upload_consent boolean default false,
  sync_enabled boolean default false,
  last_sync timestamptz
);

create table public.srs_items (
  user_id uuid references public.users(id) on delete cascade,
  word_id text,
  next_review timestamptz,
  interval integer,
  ease numeric,
  repetition integer,
  accuracy numeric,
  last_review timestamptz,
  status text,
  tags text[],
  updated_at timestamptz default now(),
  primary key (user_id, word_id)
);

create table public.srs_history (
  history_id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade,
  word_id text,
  grade integer,
  response_time numeric,
  source text,
  session_id text,
  recorded_at timestamptz default now()
);

create table public.pronunciation_sessions (
  session_id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  word_id text,
  confidence numeric,
  mode text,
  cloud_uploaded boolean,
  transcript jsonb,
  created_at timestamptz default now()
);
```
- Row Level Security restricts access to authenticated user (`user_id = auth.uid()`).
- Provide storage bucket `audio_attempts` with signed URLs expiring after 30 days.

### 8.2 REST / RPC Contract
- `POST /functions/v1/sync`  
  Request: `{ lastSync: ISO, items: [...], history: [...], profile: {...} }`  
  Response: `{ updatedAt: ISO, items: [...], history: [...], conflicts: [...] }`
- `POST /functions/v1/analyze_pronunciation`  
  Request: `{ sessionId, audioUrl, expectedText, locale }`  
  Response: `{ confidence: 0-1, transcript: "…", diff: ["ā"], processedAt }`
- Feature flag ensures these endpoints are never called unless `user_profile.settings.syncEnabled === true`.

### 8.3 Sync Algorithm
1. Client maintains `lastSync`. On trigger (manual or periodic), gather local changes since `lastSync`.
2. Send `items` (dirty `srs_items`) and new `srs_history` rows. Include `localUpdatedAt`.
3. Server merges:
   - `srs_history`: append all new rows (no conflict).
   - `srs_items`: compare `updated_at`; prefer newest. If timestamps differ but both changed, return conflict with both versions.
4. Client receives response:
   - Apply remote authoritative `srs_items`.
   - Append any remote `srs_history` rows.
   - Recompute derived fields (accuracy, intervals) using scheduler helpers.
5. Update `lastSync`.
- Offline/backoff: If request fails, queue via Background Sync (if available) or manual retry.

## 9. Non-Functional Requirements & Privacy
- **Local-first**: All core flows operate without network. Cloud sync and ASR remain opt-in; toggled via Settings with explicit description.
- **Performance**: Keep review page < 120 KB gzipped (excluding existing assets). Lazy-load Chart.js only on dashboard route.
- **Accessibility**: WCAG 2.1 AA compliance, keyboard-first navigation, `aria-live` updates for status messages, accessible chart descriptions, focus management for modals.
- **Privacy & Consent**:
  - Audio upload consent modal with textual copy: “We only upload your recordings to analyze pronunciation. Files are stored for up to 30 days and deleted when you revoke consent.”
  - Provide `Settings → Data control` panel to export JSON, delete all local data, and revoke sync/audio consent.
  - Document data retention: local audio auto-deletes after 30 days; cloud audio deleted on demand or after retention expiry.
- **Graceful degradation**: If SpeechRecognition unsupported, show manual self-evaluation checklist instead of hiding feature.
- **Internationalization**: UI copy stored in `i18n/*.json`; new strings namespaced (`srs.*`, `dashboard.*`, `pronunciation.*`).

## 10. Acceptance Criteria & Automated Test Plan
- **Acceptance Criteria**
  - Scheduler yields expected `nextReview` for provided test vectors (unit tests pass).
  - Review Mode writes a `srs_history` record per graded card, updates `srs_items`, and increments streak when due cards cleared.
  - Backup export/import round-trips data without loss; import preview shows conflicts.
  - Dashboard charts render without console errors and reflect last 30 days of activity.
  - Pronunciation flow records audio on Chrome/Edge/Firefox desktop & mobile; fallback UI appears when APIs missing.
  - Cloud sync (when enabled) pushes/pulls changes; conflicts resolved deterministically.
  - Accessibility checks (axe) report zero critical issues on Review & Pronunciation screens.

- **Unit Tests (Vitest)**
  - `test/specs/srs.test.js`: 12 vectors covering all grade transitions, interval caps, long absence.
  - `test/specs/accuracy.test.js`: Rolling accuracy math, streak calculations.
  - `test/specs/storage.test.js`: Dexie schema initialization, migrations, export/import validation.
  - `test/specs/pronunciation-scoring.test.js`: Local scoring heuristics with mocked transcripts.

- **Integration Tests (Vitest + jsdom)**
  - Simulate review session: seed queue, grade series, ensure DOM updates and Dexie writes.
  - Pronunciation modal flow with mocked MediaRecorder, verifying consent gating.
  - Dashboard data pipeline producing chart-ready datasets for sample history.

- **E2E Tests (Playwright)**
  - `review.spec.ts`: Start session, grade items using keyboard, verify completion summary, export JSON download stubbed.
  - `dashboard.spec.ts`: Load dashboard with seeded data (via `localStorage`/IndexedDB fixtures), assert charts visible, filter interactions.
  - `pronunciation.spec.ts`: Mock microphone permission, simulate recording, assert local feedback and optional ASR toggle.
  - Accessibility smoke: run `axe-core` on each screen and fail CI on violations.

- **Manual QA Checklist**
  - Offline test (Chrome dev tools) verifying review and dashboard accessible offline.
  - Multi-language check (English/Latvian/Russian) for new strings.
  - Mobile Safari test for MediaRecorder fallback message.

## 11. CI/CD Pipeline (GitHub Actions Outline)
```yaml
name: ci
on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e -- --ci --project=chromium
      - run: npm run test:a11y
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: dist

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-artifacts
      - run: npm run bundle-size:check
      - uses: actions/configure-pages@v4
      - uses: actions/deploy-pages@v4
```
- Configure required status checks (`lint`, `test:unit`, `test:integration`, `test:e2e`, `test:a11y`).
- On PR: skip deploy job.
- Add manual approval gate before production deploy when Supabase sync toggled.

## 12. Implementation Timeline (10 Weeks / 5 Sprints)
- **Sprint 1 (Weeks 1–2)** — Foundations  
  - Implement Dexie schema, storage helpers, migration scaffolding.  
  - Build scheduler module with unit tests for core vectors.  
  - Deliver backup/export UI skeleton (hidden behind feature flag).  
  - Milestone: “Local DB + Scheduler MVP” demo (console-driven).

- **Sprint 2 (Weeks 3–4)** — Review Mode MVP  
  - Implement review UI (desktop/mobile) with keyboard controls.  
  - Integrate queue builder, Dexie read/write, streak logic.  
  - Add minimal pronunciation modal (TTS + record + playback, no scoring).  
  - Milestone: “Review Mode Alpha” accessible offline.

- **Sprint 3 (Weeks 5–6)** — Pronunciation & Dashboard Foundations  
  - Implement local pronunciation scoring, consent flow, session storage.  
  - Build dashboard data pipelines and render KPI tiles + review load chart.  
  - Add Chart.js lazy loading and ensure service worker caches new routes.  
  - Milestone: “Practice & Dashboard Beta” with sample data.

- **Sprint 4 (Weeks 7–8)** — Polish & Analytics  
  - Complete dashboard charts (heatmap, accuracy line, donut).  
  - Expand pronunciation feedback (diff highlighting, fallback UI).  
  - Add export/import UX, finalize accessibility (axe passing).  
  - Milestone: “Priority A MVP” feature-complete, local-first.

- **Sprint 5 (Weeks 9–10)** — Optional Cloud Sync & Hardening  
  - Implement Supabase sync (feature flag), conflict resolution, and tests.  
  - Integrate optional Whisper ASR fallback with consent-driven upload.  
  - CI/CD enhancements, documentation, release checklist.  
  - Milestone: “Cloud-ready Release Candidate.”

### Risk & Mitigation
- **MediaRecorder support variance**: Provide fallback UI early; create mock for Playwright.  
- **IndexedDB migrations**: Ship migration tests and backup feature before increasing schema version.  
- **Bundle growth**: Monitor Chart.js (~60 KB). Consider dynamic import.  
- **Supabase dependency**: Since optional, default to disabled; ensure features hidden behind toggle.

### Rollback Plan (Sync)
- Keep sync flag default `false`.  
- If regressions detected, release patch toggling sync off via settings and hide UI entry.  
- Maintain script for clearing remote data per user deletion request.

## 13. Rollout & Privacy Plan
- **Consent UI Copy** (to display in modal):  
  “We can analyze your pronunciation by uploading recordings to our secure server for up to 30 days. You can delete uploads anytime in Settings → Data control. Recordings stay on this device unless you turn this option on.”  
  Buttons: `Continue locally`, `Enable uploads`.
- **Data retention**: Local audio auto-pruned after 30 days; remote audio deleted via scheduled Supabase function every 30 days or immediately when user toggles off consent.
- **User data rights**: Export JSON includes pronunciation metadata but not audio (unless user opts to embed base64). Delete action clears IndexedDB and optionally triggers Supabase delete endpoints.
- **Service worker**: Extend to precache new HTML and allow “update available” toast when new version deployed.

## 14. Work Breakdown & Dependencies
- Complete Issue list provided separately (see `priority-a-issues.md`).
- Dependencies: Dexie, Chart.js, optional Supabase JS client, axe-core (dev dependency), Vitest/Playwright config updates.
- No build step mandated, but we recommend adding Vite for module bundling longer term; for now continue using ES modules, bundling only for tests if necessary (`npm scripts`).

## 15. Appendices
### 15.1 Keyboard Shortcut Reference
- `1/2/3/4`: Grade Again/Hard/Good/Easy
- `Space`: Play TTS
- `P` / `Shift+P`: Open pronunciation practice / toggle upload consent
- `E`: Export progress
- `I`: Import progress dialog

### 15.2 Example Dashboard Dataset
```json
{
  "reviewLoad": [
    { "date": "2024-05-15", "due": 18, "new": 6 },
    { "date": "2024-05-16", "due": 14, "new": 5 },
    { "date": "2024-05-17", "due": 20, "new": 4 }
  ],
  "accuracyTimeline": [
    { "date": "2024-05-09", "accuracy": 0.74 },
    { "date": "2024-05-10", "accuracy": 0.78 },
    { "date": "2024-05-11", "accuracy": 0.82 }
  ],
  "timeSpent": [
    { "context": "review", "seconds": 960 },
    { "context": "match", "seconds": 420 },
    { "context": "pronunciation", "seconds": 180 }
  ]
}
```

### 15.3 Glossary
- **SRS**: Spaced Repetition System
- **Ease factor**: Controls interval growth rate
- **Dexie**: Promise-based IndexedDB wrapper
- **ASR**: Automatic Speech Recognition (Whisper or similar)
- **TTS**: Text-to-Speech

---

Prepared by: Agentic AI (Codex)  
Date: 2024-05-15
