# Future Build Ideas (expanded)

This document collects prioritized, actionable ideas to evolve Latvian_Lang_B1 from a static collection of browser games into a richer, modern learning product. Each feature includes implementation notes, data shape examples, recommended technologies, and suggested testing & deployment guidance.

---

## 1 — Feature roadmap (prioritized)

Priority A — High impact, small-medium effort
- Spaced Repetition System (SRS) and per-word accuracy tracking
- Persistent user progress (IndexedDB + optional backend)
- Pronunciation practice (Web Speech API + basic ASR fallback)
- Progress Dashboard with simple charts

Priority B — Medium impact
- Custom Lesson Builder (CSV/JSON import, shareable deck links)
- Offline-first content packs (downloadable JSON bundles + service worker caching)
- Accessibility improvements & keyboard navigation completion

Priority C — Advanced
- Multiplayer challenges (WebRTC or Supabase realtime)
- AI-assisted grammar explanations & practice prompts (optional)
- Teacher portal / Content Management (headless CMS)

---

## 2 — Actionable feature descriptions & implementation notes

Spaced Repetition (Priority A)
- What: Per-word review scheduling using an SM-2 or FSRS variant (review date, interval, ease factor). Track accuracy per word and by grammar category.
- Data model (example):
  {
    "id":"lv-0001",
    "word":"runāt",
    "last_review":"2025-10-15T08:00:00Z",
    "interval_days":4,
    "ease":2.5,
    "repetition":3,
    "stability":1.2,
    "accuracy":0.78
  }
- Client implementation: Use Dexie.js (IndexedDB wrapper) to store SRS items and history. Sync optionally to backend (Supabase).
- UI: “Review” mode with queue based on due date; simple grading buttons (Easy / Good / Hard / Again).

Persistent Progress & Sync (Priority A)
- Local-first: store everything in IndexedDB; expose export/import JSON for backups.
- Optional sync: Supabase (Postgres) + Supabase Auth (email/social) for user accounts. Save only minimal, hashed identifiers and per-word metrics.
- Conflict resolution: last-write-wins with timestamps + simple merge on reconcilable fields (progress, badges).

Pronunciation Practice (Priority A)
- Use Web Speech API for TTS and SpeechRecognition (browser support varies). Provide fallback: accept recorded audio and upload to a Whisper-like service for transcription when user opts in.
- Show pronunciation score heuristics: word-level match, missing or mispronounced vowels/lengths, or use phoneme distance (if using Whisper + phoneme alignment).
- Privacy: record locally by default; upload only with explicit user consent and provide deletion controls.

Custom Lesson Builder (Priority B)
- UI: CSV/Excel import, visual editor to reorder/mark games supported, export shareable JSON link.
- Data import note: provide validation (required fields: `lv`, `en`, `ru`, `games[]`, `unit`).
- Example unit:
  {
    "unit":"Transport",
    "entries":[{"lv":"autobuss","en":"bus","games":["match","travel"], "notes":"—"}]
  }

Offline Content Packs (Priority B)
- Pack format: zipped or JSON bundles with manifest (version, slug, size, checksum).
- Service worker: add caching + IndexedDB registered packs. Use background sync to fetch updates when online.

Multiplayer Challenges (Priority C)
- Use WebRTC for direct low-latency competition or Supabase Realtime / Firebase Realtime for easier implementation.
- Game flow: create match lobby with deck slug, join via link, synchronized seed for RNG to ensure same deck order.

AI & Grammar Explanations (Priority C)
- Integrate small LLM prompts (server-side or via a third-party API) to generate example sentences, explanations for a mistake, or hints.
- Keep usage opt-in and rate-limited.

Accessibility & Internationalization
- Continue expanding ARIA roles, ensure keyboard-only operation for every game, add live regions for success/failure messages.
- Use ICU-style pluralization for translated strings. Consider switching to an i18n framework if migrating to a JS framework.

---

## 3 — Tech stack & architecture recommendations

Frontend (current static approach is fine for small scale)
- Short term: keep ES modules; add Dexie.js for IndexedDB, Chart.js for dashboard.
- Medium term: adopt Vite + framework (Svelte/React) for maintainability. Svelte offers small bundle and simple transitions (nice for game UX).

Backend (optional)
- Supabase (Postgres + Auth + Realtime) — recommended for simplicity and open source friendliness.
- Alternatively: Firebase for managed realtime & storage; or a self-hosted Strapi/Directus for CMS.

Speech & ASR
- Web Speech API (client-side) for baseline. For server-side transcription use Whisper (open-source) or a managed Whisper API.

CI / Deployment
- Vercel or Netlify for easy static hosting + functions.
- GitHub Actions for tests, linting, and deployment to Pages / Vercel.

Tools & libraries
- Dexie.js for IndexedDB
- Workbox (or a manual service worker with strategies) for advanced caching
- Chart.js / ECharts for dashboards
- Vitest + Playwright for unit + E2E tests
- ESLint + Prettier + TypeScript (gradual adoption)

---

## 4 — Sample data formats

Vocabulary entry (minimal)
{
  "id":"lv-0001",
  "lv":"ēst",
  "en":"eat",
  "ru":"есть",
  "games":["match","conjugation"],
  "notes":"irregular"
}

SRS record (example)
{
  "wordId":"lv-0001",
  "lastReview":"2025-10-20T10:00:00Z",
  "intervalDays":3,
  "ease":2.6,
  "repetition":2,
  "nextReview":"2025-10-23T10:00:00Z",
  "accuracy":0.67
}

Lesson export JSON
{
  "slug":"week-1-transport",
  "title":"Week 1 — Transport",
  "version":"1.0",
  "units":[ /* entries as above */ ],
  "createdBy":"teacher@example.org"
}

---

## 5 — Priority implementation roadmap (90-day plan)

Weeks 0–2 (setup)
- Add Dexie.js and local SRS store
- Implement basic review UI and export/import
- Add unit tests for scheduler logic
Weeks 3–6
- Dashboard with charts (accuracy, time, streaks)
- Pronunciation: add TTS playback + micro frontend for recording
Weeks 7–12
- Optional Supabase integration: auth + cloud sync
- Lesson Builder: CSV import + share link generation
- Offline content packs & improved SW caching
Weeks 13+
- Multiplayer; AI features; teacher portal + CMS

---

## 6 — Testing, CI & quality guidance

Unit tests
- Isolate logic: SRS scheduler, normalized matching, parsing utilities
- Use Vitest (or Jest) for fast runtimes

E2E tests
- Playwright to simulate game flows: match round, forge round, endings builder drag-and-drop
- Accessibility tests (axe-core integration)

CI
- GitHub Actions: lint -> test -> build -> deploy (to Pages / Vercel)
- PR checks: run tests, run accessibility checks, ensure no large bundle regression

Code quality
- Adopt TypeScript gradually for core modules (state, data shapes, render contract)
- Add JSDoc where TypeScript adoption is slower

---

## 7 — Privacy & data minimization

- Default to local storage only. Any upload or sync must be opt-in and documented.
- Minimal user profile fields (email optional). Anonymize or pseudonymize analytics.
- Provide data export & complete deletion endpoints if backend used.
- If recording voice, require explicit consent and show retention policy; provide local-only mode.

---

## 8 — How to save & download this file locally

Option A — Save manually
- Copy the contents of this file and paste into `build-idea.md` in repo.

Option B — Save via terminal (create file locally)
Run:
cat > build-idea.md <<'EOF'
# Future Build Ideas (expanded)

... (paste entire file contents here if using this method) ...
EOF

Option C — Use this file to open a PR (I can draft PR content if you want; see next steps).

---

## 9 — Next steps I can take for you
- Draft a pull request that adds this updated file to the repository (I can prepare the exact patch).
- Create issues for each high-priority item with acceptance criteria.
- Start an initial implementation branch for the SRS + Dexie local storage and a review UI.

If you'd like a downloadable artifact (ZIP) made and a PR created, tell me which action you prefer and I will draft the PR or create the issues next.