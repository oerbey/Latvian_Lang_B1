# Platform login and exercise progress

## Delivery checkpoint

Steps 1–7 are implemented on `feature/platform-progress-contracts`. Step 1
introduced the registry of 21 published exercises and pure progress contracts.
Step 2 adds shared account controls, validated callback return navigation and
cross-tab session invalidation. Step 3 enables API read/write for Word Quest and
Darbības Vārdi and adds authenticated account summaries. Step 4 adds reusable
browser storage and synchronization. Word Quest and original Darbības Vārdi
now use it during gameplay. My Progress shows their summaries and links to all
registered exercises.
The production baseline predates these changes.

The agreed experience is one email/password login across exercises and browser
tabs, a My Progress page with summaries and Continue links, and cross-device
restoration of saved learning state. Guest and account progress remain separate;
there is no automatic import. Detailed answer history and historical charts are
outside this version. Keep existing identity resources, verified owner IDs, Cosmos
containers and Dev/production separation.

Implement one numbered step at a time, verify its acceptance criteria, record
results in `progress.md` and stop at the checkpoint before the next step.

| Step | Change                                        | Acceptance checkpoint                                                                                                                                       | Status      |
| ---- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1    | Exercise registry and progress contracts      | Every published exercise is registered; Word Quest and Darbības Vārdi fixtures validate, restore and summarize                                              | Implemented |
| 2    | Shared login/navigation and cross-tab session | Login from Home works on other exercise pages and tabs; logout clears the displayed account in every tab; callback returns to a validated local destination | Implemented |
| 3    | Multi-exercise API and summary endpoint       | Server-owned partition access, exercise validation, missing records and revision conflicts pass API tests; existing Word Quest responses remain compatible  | Implemented |
| 4    | Owner-scoped storage and reusable sync        | Pending saves survive refresh; offline recovery, conflict choice, account changes and revisioned reset pass tests                                           | Implemented |
| 5    | Word Quest uses shared services               | Existing account, guest, logout, delayed-response and conflict checks pass with existing saved progress and account isolation                               | Implemented |
| 6    | Original Darbības Vārdi pilot                 | A partially matched board and statistics restore after refresh and on another device; guest state stays independent                                         | Implemented |
| 7    | My Progress page                              | Word Quest and Darbības Vārdi summaries agree with saved state; mobile/accessibility and empty/offline/partial-error states pass                            | Implemented |
| 8    | Remaining exercise integrations, individually | Each exercise passes adapter, sync, dashboard and cross-device acceptance before the next integration                                                       | Pending     |
| 9    | Dev acceptance and production release         | Two-account/two-tab/two-browser checks and full CI pass; release uses the existing manual production approval workflow                                      | Pending     |

## Contract interface

`src/lib/exercise-registry.js` exports immutable `EXERCISES` and
`getExercise(gameId)`. An entry has a stable `id`, page `href`, display `title`,
`tracking` (`cloud` or `planned`), intended `resume` policy and supported summary
`metrics`. Versions and the two trait-matching pages have distinct IDs. Titles
and URLs can change without changing persistent IDs. Exclude Home, the callback,
design prototypes and landing concepts from the exercise inventory.

`src/lib/progress/index.js` exports `getProgressAdapter(gameId)`. It returns an
adapter for `word-quest` or `darbibas-vards`, otherwise `null`. Both exercises are marked
as connected in the registry.
Neither module performs storage, authentication, network access or migration.

Adapters expose:

- `schemaVersion`: currently `1`.
- `maxBytes`: maximum UTF-8 JSON payload size. Word Quest retains 64 KiB; the
  matching snapshot permits 256 KiB to include per-word statistics, five recent
  sets, the locked set and the current board. A full current vocabulary fixture
  checks that the matching snapshot fits. Step 3 applies the matching limit to
  its API saves while preserving Word Quest's existing 64 KiB validator. The
  deployed production API remains Word Quest-only until a separate release.
- `createDefault()`: a fresh empty snapshot on every call.
- `validate(data)`: `null` for valid saved data, otherwise an error string.
- `normalize(data, context?)`: validate and return a detached restored snapshot;
  `null` or an omitted snapshot returns defaults. Invalid/future schemas throw
  `TypeError` so a caller can report failure without rewriting the stored data.
- `summarize(data, context?)`: derive summaries from raw saved data without
  recording activity or modifying the snapshot. Missing historical metrics
  remain `null`; call this before filling legacy missing fields with defaults.

The common summary fields are `attempts`, `correct`, `accuracy` (rounded integer
percentage) and `lastPlayedAt` (ISO timestamp or `null`). Zero attempts has no
accuracy (`null`), rather than a misleading 0%. Additional metrics appear only
where supported: `xp`, `bestScore`, `bestStreak`, `wordsPractised`,
`completion: { completed, total }`, `coverage: { practised, total }`, and mastery
derived from an exercise's existing learning rules when its adapter is added.
Completion, vocabulary exposure and mastery are different concepts.

The summary endpoint derives these metrics from the verified owner's saved
records, not a separate browser-supplied summary. Missing records,
tracking not yet connected and unavailable cloud data are distinct UI states.

## Step 3 API contract and packaging

Current source enables `word-quest` and `darbibas-vards`, the two registered IDs
with implemented adapters. `CLOUD_PROGRESS_GAME_IDS` describes API readiness,
independently of the registry's game/UI `tracking` rollout. Catalogue entries
without an adapter are rejected by read/write endpoints with HTTP 400, before
accessing Cosmos. Add an adapter and regenerate the API package when integrating
another exercise; do not accept arbitrary data for every catalogue ID.

- `GET /api/getProgress?gameId=<enabled-id>` returns the existing public progress
  envelope or literal JSON `null` for a missing record. Word Quest's shape and
  owner/exercise IDs are unchanged.
- `POST /api/saveProgress` retains `{ gameId, data, expectedRevision }`, the
  existing `{ ok, item }` response, server-derived ownership and revision/ETag
  conflicts. The matching payload uses the Step 1 validator; Word Quest retains
  its previously accepted optional/legacy fields and schema-version handling.
  No snapshot normalization or migration runs during these API writes.
- `GET /api/getProgressSummary` returns `{ userId, exercises }`. The owner is
  verified by the API; request user IDs do not select a partition. Each of the
  21 exercise entries is `{ gameId, tracking, status, summary }`. `summary` is
  derived from stored data, never a separately submitted metrics object.

Summary `status` values are:

| Status          | Meaning                                                                                  | Summary                 |
| --------------- | ---------------------------------------------------------------------------------------- | ----------------------- |
| `saved`         | An enabled exercise has a readable saved snapshot                                        | Adapter-derived metrics |
| `not-started`   | An enabled exercise has no account record                                                | `null`                  |
| `not-connected` | No API adapter exists for this exercise yet                                              | `null`                  |
| `unavailable`   | A saved record cannot be summarized, including an unsupported schema or invalid revision | `null`                  |

The registry reports `cloud` for the two connected exercises. The dashboard can
use the flag to explain where account progress is available.
Do not manufacture zero metrics for any `null` summary. A storage/query outage
returns HTTP 503 rather than a misleading empty account; individual unreadable
records return `unavailable` without preventing other rows from loading.

The summary query is parameterized, explicitly targets the verified `/userId`
partition and selects only canonical IDs for enabled games. It returns no raw
per-word statistics, current boards, world snapshots, SDK claims or private
Cosmos/ownership metadata. Word Quest completion uses the same world node counts
as gameplay; matching coverage uses current dataset IDs. Last answer activity is
not inferred from record update time. All progress APIs remain token-protected
and no-store, and service worker v32 bypasses private API traffic while caching
new public transport dependencies.

The browser transport retains existing load/save result shapes, validates both
the requested owner and requested game on responses/conflicts, and adds
`loadCloudProgressSummary({ userId, signal })`, returning `{ status, exercises }`.
It rejects wrong-owner, missing/duplicate exercise and malformed summary
responses, and discards cancelled responses even after JSON parsing.

Azure deploys `api/` independently of the website. Run
`npm run build:progress-api` after editing shared registry/contract modules or
rebuilding `data/words.json`. The script generates
`api/generated/progress-contracts/`, including an ESM package marker, the portable
shared modules and current vocabulary-ID context. The API imports only that
local package; it never reaches into a parent website checkout. Generated
artifacts are committed and must not be hand-edited. `npm run build:all` includes
this build. `npm run validate:progress-api` and CI verify exact source/artifact
parity without rewriting files. A standalone-package test loads the API and its
contracts without website sources present.

### Word Quest compatibility

- Retain the existing root `data` shape: `schemaVersion`, `xp`, `level`, `streak`,
  `bestStreak`, `worlds`, `totalCorrect` and `totalWrong`. Do not wrap it in a new
  state/metrics envelope or change `${ownerKey}:word-quest` record IDs.
- Normalize legacy snapshots without a schema version by supplying version 1
  defaults. Retain additional saved fields and detach nested objects. Future
  explicit schema versions are unsupported by this adapter; this does not change
  today's API validator.
- `attempts = totalCorrect + totalWrong`; accuracy uses that denominator. If a
  historical counter is absent, do not infer it from XP or level.
- Supply authoritative `context.worldNodeCounts` from the game's world
  definitions to calculate completion. Count unique in-range numeric node IDs
  only; ignore retired worlds. Without definitions, completion is unavailable.
- The current snapshot has no answer-activity timestamp. `lastPlayedAt` stays
  `null`; do not substitute the server record's update time, which may reflect a
  map visit. Resume at the saved world/node checkpoint, not inside a battle.
- Step 5 copies eligible guest/account data into the shared store for the same
  owner. The old keys remain available as a backup.

### Original Darbības Vārdi snapshot

The complete example is `test/fixtures/progress/darbibas-vards.json`.

| Field          | Meaning                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stats`        | Map from the existing `lv\|en` matching ID to `{ correct, incorrect, lastSeen }`; `lastSeen` is answer time in Unix milliseconds, with 0 meaning unknown |
| `settings`     | `language` (`en`/`ru`), `boardSize` (6/8/10/12), `mode` (`all`/`locked`), `lockedSetSize` (integer at least 5), `prioritizeMistakes`                     |
| `lockedSet`    | Ordered word IDs, next-board `cursor`, `lastSliceStart`, and serialized per-word `priorityChain` counts (0–2)                                            |
| `recentSets`   | At most five recent arrays of word IDs, used for new-mix selection                                                                                       |
| `currentBoard` | `null` or `{ itemIds, matchedIds, wrong }` for the active/completed board; matched IDs must belong to that board                                         |

Keep the existing item ID rule (`lv` + `|` + English translation) regardless of
the selected translation language. A translation edit can retire an ID; do not
silently credit the edited item as already practised. Speech preferences remain
device-local and are excluded from the canonical snapshot, along with transient
selected tiles and feedback timers.

Supply `context.itemIds` from the loaded dataset when restoring or calculating
coverage. Omit it only when the dataset is unavailable; an explicit empty array
means there are no current items. Normalize deduplicates IDs, removes retired
IDs from sets/boards and remaps the cursor to the next surviving item without
advancing it. Retain retired statistics for lifetime answer totals. Coverage
counts only current dataset IDs with at least one correct or incorrect answer.
`wordsPractised` counts distinct historically attempted words. Neither metric
claims mastery. Last activity is the latest known timestamp of an attempted word.

The matching exercise restores the snapshot before enabling answers. It disables
matched pairs and derives the board score from unique `matchedIds`. Restoring
a board adds no attempts or rewards and leaves the locked cursor in place.
Each mutation saves a coherent snapshot.

On first guest use, the exercise copies valid learning fields from `dv_config`,
`dv_activeSet`, `dv_cursor`, `dv_recentSets`, and `dv_stats` into the guest store.
Old saves have no recorded board, language or board size. The original guest
keys remain as a backup and `dv_speak` stays device-local.

## Remaining exercise contracts and integration order

All planned integrations record new answer totals/activity from actual answer
events. Preserve available legacy metrics; missing historical counters stay
unavailable. A page visit, settings change or sync retry is not activity.
Checkpoint resumes restore learning state and begin at a safe prompt boundary.
Round resumes restore cumulative results/preferences and start a fresh timed or
animated round; they do not resurrect timers or award interrupted-round results.

| Order | Exercise ID                  | Learning state to preserve/add                                                          | Additional summaries                                  |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Pilot | `darbibas-vards`             | Matching snapshot above                                                                 | Words practised, coverage                             |
| 1     | `darbibas-vardi-v2`          | Per-verb mastery/scheduling records, XP, streaks, rounds, language/preferences          | Existing mastery, XP, best streak                     |
| 2     | `form-factory-v3`            | Per-item mastery/scheduling, XP, deck, rounds                                           | Existing mastery, XP, best streak                     |
| 3     | `sentence-surgery-passive`   | Completed IDs, attempts, correct count, topic/order settings                            | Completed items                                       |
| 4     | `similar-word-groups`        | Completed task IDs, current group/task, answer results                                  | Completed tasks                                       |
| 5     | `prefixed-coming-verbs`      | Completed item IDs, current section/item, answer results                                | Completed items                                       |
| 6     | `conjugation-sprint`         | Best score/streak, pace and tense preferences                                           | Best score/streak                                     |
| 7     | `form-factory`               | Best score/streak, mode/deck preferences                                                | Best score/streak                                     |
| 8     | `form-factory-v2`            | Best score/streak, deck preferences                                                     | Best score/streak                                     |
| 9     | `endings-builder`            | Per-item practice strength, strict setting, prompt checkpoint                           | Words practised; strength is not a mastery percentage |
| 10    | `passive-lab`                | XP, streak, settings and prompt checkpoint                                              | XP                                                    |
| 11    | `maini-vai-mainies`          | XP, streak, settings and prompt checkpoint                                              | XP                                                    |
| 12    | `duty-dispatcher`            | XP, streak, task checkpoint                                                             | XP                                                    |
| 13    | `decl6-detective`            | XP/streak and best round score; start a fresh timed investigation                       | XP, best score                                        |
| 14    | `travel-tracker`             | Level, route, seed, started flag, score/streak and safe question boundary               | Best score                                            |
| 15    | `character-traits-match`     | Independent matching snapshot using the shared matching adapter pattern                 | Words practised, coverage                             |
| 16    | `character-traits-expansion` | Independent matching snapshot, separate from standard matching                          | Words practised, coverage                             |
| 17    | `character-traits`           | Mode, per-word completed practice, last result, group results and prompt checkpoint     | Completed items                                       |
| 18    | `week1`                      | Separate Match/Forge result totals, vocabulary unit/mode/preferences; start fresh round | Best score                                            |
| 19    | `english-latvian-arcade`     | Best score/streak and result totals; start fresh arcade round                           | Best score/streak                                     |

The trait matching pages currently share `traits_match_*` local keys. Those
unscoped legacy values remain guest history; do not copy them into two account
records or claim that activity belongs to both variants. Their later integration
must keep new per-exercise account progress independent.

## Step 4 storage and sync integration

Create one `createProgressSync(gameId, { onChange })` per exercise page. Call
`setSession(userId)` with the verified owner or `null` for guest play. Tell the
service when connectivity changes with `setOnline`. Account transitions replace
the current view and abort requests and timers. Call `dispose` when the service
is no longer needed.

- `onChange` and `view()` provide detached snapshots with the current owner,
  status, progress and pending flag. Render new data from that view.
- `saveLocal(data)` and `reset()` return whether the browser accepted the change.
  Reset writes exercise defaults as a normal revisioned snapshot. Failed writes
  leave the last stored snapshot intact. `retry()` reopens local storage after a
  local error or rechecks the cloud revision after a network error. After an
  authentication failure, call `setSession` again with a reverified owner.
- The browser stores one record per owner and exercise at
  `llb1:progress:v1:<gameId>:<owner-or-guest>`. The snapshot, base revision, and
  pending flag are saved together. A delayed acknowledgement preserves newer
  edits. The service checks for changes by other tabs before writing or
  acknowledging. The cloud still uses the server's conditional revision checks.
- When a newer cloud revision differs from pending local data, the view exposes
  both snapshots. Pass the current conflict ID to `resolveConflict('local', id)`
  or `resolveConflict('cloud', id)`. An outdated choice has no effect. Refresh
  or reconnect checks the current revision again before permitting a save.

## Step 5 Word Quest integration

Word Quest uses the shared service for guest and account saves, cloud revisions,
and conflict choices. Shared navigation handles login and logout. The game still
shows its sync status and prompts for conflict choices. A change of owner clears
the active battle. Reconnecting with identical saved progress keeps it open.

The first open of each owner’s new storage key copies any valid snapshot from
`llb1:word-quest:v2:<owner-or-guest>` and reads the associated `:sync` key for an
account’s pending state. Pending changes retain their base revision where known.
If the old split keys disagree, the game snapshot takes precedence because the
old writer saved it first. Divergent legacy progress without a known pending base
requires a choice. Later opens use the shared record and the old keys remain as
a backup. The migration keeps guest and account data separate. Pre-v2 unscoped
data remains outside this migration.

Service worker v34 caches the shared sync modules and both exercises’ offline
dependencies.

## Step 6 Darbības Vārdi integration

The matching exercise uses the shared sync service and saves after answers, new
boards, language changes and study mode changes. Restoration reuses the saved
board and locked set position. Completed pairs stay disabled and restoration
adds no attempts or rewards. Translation tiles are shuffled again when the
board is displayed. The score for the open board and lifetime attempt metrics
are shown separately. Coverage counts practised entries from the current
vocabulary and the API uses the same item IDs. Pronunciation stays on the device.

The browser test restores a partially completed board in an independent browser
context using a fixture account and API. It verifies that the board, score,
language, and locked cursor resume without additional writes, and that logout
restores the original guest’s progress.

## Step 7 My Progress dashboard

The dashboard loads both account summaries with one authenticated request and
links to all 21 exercises. Tracking for the remaining exercises is marked as
coming soon. The cards use exercise-specific metrics such as Word Quest nodes
completed and Darbības Vārdi vocabulary coverage. Missing metrics are omitted.

Guests can view browser history, including supported legacy saves. The dashboard
reads the old keys without migrating them. If a cloud summary is unavailable
and the account has already been verified, the page can show a labelled copy
from that owner's browser store. A fresh offline visit shows guest history.
Sign-out and account switches clear the old view and cancel in-flight account
reads. The dashboard is available in English, Latvian and Russian and its assets
are precached by service worker v35.

## Verification and release

Step 1's Node tests cover catalogue/nav/homepage parity, published page existence,
immutable IDs/capabilities, legacy Word Quest wire compatibility, absent historical
metrics, partial/completed board restoration, dataset changes, retired statistics,
unknown schemas, malformed/oversized payloads and a full-vocabulary snapshot.
No browser UI changes are included in this step.

Step 2 adds shared navigation account status, login/logout and a My Progress
entry page that links to existing Word Quest results. Exercise summary cards are
still Step 7. Shared labels use the current page language (LV/EN/RU). The pinned
MSAL SDK loads on demand after public configuration succeeds; guest exercise
loading is independent of account availability.

MSAL now owns a `localStorage` cache shared by tabs on the same site origin.
Existing per-tab sessions may need to sign in again after this update; do not
manually copy tokens between caches. Return destinations live in tab-scoped
session storage and accept only exact published page paths, without queries,
fragments, APIs or external URLs. Missing or inaccessible return state falls back
to Home. Sign-out uses the same safe return behavior and existing registered
callback, so no identity-registration changes are required.

The auth service exposes synchronous `onAuthChange` notifications and invalidates
verified owner/token generations before views can continue. SDK account events
trigger fresh SDK cache initialization before token acquisition, preventing
lookups against incomplete asynchronous cross-tab cache imports. Web Locks
serialize first-time SDK initialization where available. A separate same-origin
sign-out signal clears other tabs before provider logout finishes. Completed
sign-in sends a refresh signal after the SDK cache is ready. Both signals carry
no account data. The API verifies identity through `/api/authSession`.
Focus/page restoration also reconciles the active account.

Word Quest has a minimal auth-change subscriber to cancel pending synchronization,
close conflicts and clear battles/account views on owner transitions. Step 5
moved synchronization to the shared service and preserved the cloud wire shape.
Same-owner renewal uses its existing reconnection path. Late parsed session responses cannot
revive a signed-out owner. Service worker v31 precaches the new public modules and
progress entry page; callbacks and private API responses still bypass caching.

Step 2 tests exercise real MSAL hosted redirects, safe error returns, one login
across three open pages/tabs, a new tab restoring the shared session, two-account
switching, logout during a battle, mobile navigation, unavailable auth and SDK
download retry. Unit tests cover immediate sign-out propagation, stale token and
session-response rejection, subscriber failures and callback destination safety.

After each implementation step, update `progress.md` and add only implemented
behavior to `CHANGELOG.md`. Use Node 20 and the repository checks. Before a PR,
run root/API tests, lint, formatting, typecheck, data/i18n validation and Playwright.
Later Dev acceptance must verify two accounts, two tabs, two browsers, offline
recovery and conflict handling. Production deployment remains a separate action
through the existing exact-SHA CI and manual environment approval workflow.
