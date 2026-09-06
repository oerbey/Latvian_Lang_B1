# Azure Cosmos DB integration: status and remaining work

Reviewed on 2026-09-06 against local commit `3508767`.

The repository implements an initial Azure Static Web Apps / Azure Functions /
Cosmos DB progress-saving prototype. Word Quest can attempt to upload local
progress, but cloud restore and per-user authentication are unfinished. There is
no Cognos integration in the inspected code; this report assumes “Azure Cognos”
refers to Cosmos DB.

The initial repository audit was followed by a read-only Azure portal review on
2026-09-06. The verified settings and remaining verification limits are recorded
below. That portal review changed no Azure settings or database records. The
subsequent dev diagnostic created one isolated test record, as described next.

## Live dev verification implemented — 2026-09-06

Run `npm run verify:cloud:dev` from the repository root with Node 20 or newer and
network access. No Cosmos keys or additional packages are needed. The command is
fixed to the dev URL confirmed through Azure's Environments page:
`https://red-ocean-014d1e603-dev.westeurope.4.azurestaticapps.net`.

The live run passed API health, missing-game validation, missing-record lookup,
initial save/read, and update/read. Each read matched the complete saved payload,
including Latvian characters and nested data. This confirms dev API-to-Cosmos
read/write connectivity with the currently configured credentials. A separate
read-only production health check also returned HTTP 200 with the expected body;
production database writes were not tested.

Each diagnostic run uses a random `integration-check-<UUID>` user and game ID
`integration-check`. It does not use `demo-user` or a player's Word Quest record.
Redirects are rejected and requests time out after 20 seconds. The diagnostic
is opt-in and is not included in normal tests or CI because it writes to Azure.
It checks the current anonymous prototype contract and must be revised when
authentication is introduced; do not bypass authentication to keep it passing.

One disposable record remains in `llb1/progress_dev` because no deletion endpoint
exists. Successful run document ID:
`integration-check-f785461a-3371-432a-9250-2bbef1b7620e:integration-check`.
Future runs also retain one small record each and print its ID even if a later
step fails. These can be reviewed and removed manually in Data Explorer.

Observed response quirk: a missing document returns HTTP 200 with an empty body
and no JSON content type. The diagnostic tolerates that only for the initial
missing-document lookup; saved records must return valid JSON and exact data.
Normalize this response when hardening the API.

Four local diagnostic tests cover successful create/update, stale reads,
health failures before writing, and empty-body behavior. The next implementation
milestone is authenticated server-derived ownership before enabling cloud restore.
The profile-container naming correction remains outstanding.

## Azure portal verification — 2026-09-06

- Static Web App `Latvian` exists in resource group `AZ-myWebApp`, on the Free
  hosting plan, connected to `oerbey/Latvian_Lang_B1`.
- Production (`main`) is Ready, last updated 2026-08-01 at 21:52:29 GMT+3,
  receiving 100% of traffic. Preview environment `dev` is Ready, last updated
  2026-08-01 at 21:48:55 GMT+3.
- Both environments list a managed Function App backend. Production lists
  `getProgress`, `health`, and `saveProgress`.
- Both environments have all five Cosmos environment-variable names. The
  `COSMOS_KEY` value was kept hidden; its validity was not tested.

| Setting                     | Production                                | dev                                       |
| --------------------------- | ----------------------------------------- | ----------------------------------------- |
| `COSMOS_DATABASE`           | `llb1`                                    | `llb1`                                    |
| `COSMOS_ENDPOINT`           | `https://oerbey.documents.azure.com:443/` | `https://oerbey.documents.azure.com:443/` |
| `COSMOS_PROGRESS_CONTAINER` | `progress_prod`                           | `progress_dev`                            |
| `COSMOS_PROFILE_CONTAINER`  | `profile_prod`                            | `profile_dev`                             |

Data Explorer confirms database `llb1` contains `progress_prod`, `progress_dev`,
`profiles_prod`, and `profiles_dev`. Both progress containers use `/userId` as
their partition key and have time-to-live disabled. Production and dev therefore
use separate progress containers within the same database/account.

**Confirmed mismatch:** profile settings use singular `profile_prod` and
`profile_dev`, whereas the actual containers use plural `profiles_prod` and
`profiles_dev`. Correct those settings before using the profile helper. Current
progress endpoints do not call that helper, so this does not explain a progress
save failure.

The browser blocked navigation to the production `/api/health` URL with
`ERR_BLOCKED_BY_CLIENT`. Consequently, live endpoint responses, key validity,
API-to-Cosmos connectivity, and successful writes remain unverified. No save/read
round trip was performed. GitHub secret values, network rules, and deployed
authentication enforcement were not inspected. Portal deployment status and
function registration alone do not prove an end-to-end save works.

The checklist below retains the original implementation plan; this section
supersedes its previously unverified resource/settings prerequisites where stated.

## Development completed

| Date       | Commit               | Development                                                                                           |
| ---------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| 2026-04-07 | `f19da6a`, `c7c71a5` | Introduced the Azure Static Web Apps deployment workflow.                                             |
| 2026-04-08 | `4f3528d`, `4a98cb3` | Added development-environment/branch configuration.                                                   |
| 2026-04-10 | `66ae567`            | Added Azure Functions health, save-progress, and get-progress endpoints, plus a Cosmos client helper. |
| 2026-04-10 | `03235c1`            | Configured the managed API runtime as Node 20.                                                        |
| 2026-04-10 | `31b4487`            | Staged static files separately from the API for deployment.                                           |
| 2026-04-10 | `2a5ea45`            | Added browser cloud-progress helpers, Word Quest uploads, and four helper tests.                      |

No later changes to the integration files appeared in the inspected local history.

### Backend and deployment

- `api/src/lib/cosmos.js` lazily creates a Cosmos client using environment
  variables and exposes progress and profile container helpers.
- `GET /api/health` returns a static API-health response. It does not test Cosmos
  connectivity.
- `POST /api/saveProgress` upserts a document containing `id`, `userId`, `gameId`,
  `data`, and a server-generated `updatedAt` timestamp.
- `GET /api/getProgress` reads one document, returning `null` if it is missing.
  Both progress endpoints require a truthy `gameId`.
- Documents use the ID `${userId}:${gameId}`; reads pass `userId` as the partition
  key value, so the container configuration must match that assumption.
- `.github/workflows/azure-static-web-apps-red-ocean-014d1e603.yml` deploys pushes
  to `main` and `dev`, handles PRs targeting `main`, and closes PR environments.
  It stages the static site under `.swa-static`, excludes the API and workflows
  from that staging directory, and supplies `api` separately for API deployment.
- `staticwebapp.config.json` specifies `node:20`. It contains no authentication
  route restrictions.

### Browser integration

- `src/lib/cloud-progress.js` provides `saveCloudProgress` and
  `loadCloudProgress`, using same-origin `/api/...` URLs.
- The helpers tolerate HTTP, network, and JSON-decoding failures by returning
  `false` for saves or `null` for loads.
- `src/games/word-quest/main.js` saves to local storage first and then attempts a
  cloud upload of the full state: XP, level, streaks, world progress, and answer
  totals. Failed uploads produce a console warning.
- Word Quest is the only game currently using these helpers. Its startup still
  loads exclusively from local storage; `loadCloudProgress` has no game caller.
- If the local save fails, Word Quest skips its cloud upload too.

## Remaining work, in recommended order

### 1. Establish the actual deployment and database state

- [ ] Inspect the latest Azure deployment and confirm that all three Functions
      routes are deployed and reachable on the intended site.
- [ ] Verify these application settings without putting their values in source:
      `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE`, and
      `COSMOS_PROGRESS_CONTAINER`.
- [ ] Confirm the progress container exists and uses `/userId` as its partition
      key, consistent with the current read implementation.
- [ ] Verify the workflow deployment secret exists and document which Azure
      environments `main`, `dev`, and PR deployments use, including whether their
      databases are isolated.
- [ ] Perform a controlled save/read round trip with disposable test data.

These are unverified prerequisites, not confirmed missing Azure resources.

### 2. Replace the shared demo identity before enabling real user sync

- [ ] Add sign-in and derive the user identity on the server from a validated
      authentication context.
- [ ] Require authentication for progress reads and writes and enforce ownership.
      Do not trust a `userId` supplied by the browser.
- [ ] Remove the `demo-user` fallback from real-user operations and define guest
      behavior and local-progress migration after sign-in.

Currently both endpoints are anonymous and accept arbitrary client user IDs.
All default Word Quest uploads target the same `demo-user:word-quest` document.
If deployed as written, users can overwrite that shared progress, and a supplied
user ID is sufficient to select another user's document. Function-level
`authLevel: 'anonymous'` must be assessed together with the eventual platform
authentication enforcement; no such enforcement exists in the inspected routes.

### 3. Finish Word Quest save and restore

- [ ] Load cloud progress during initialization and apply a validated state
      before allowing changes that might overwrite it.
- [ ] Define how local-only progress, cloud progress, resets, and conflicting
      device histories are reconciled. Add schema/version metadata as needed.
- [ ] Distinguish “no saved record” from “cloud unavailable”; both currently
      produce `null` in the browser helper.
- [ ] Serialize/coalesce uploads and implement an explicit concurrency policy.
      Current fire-and-forget full-document upserts can arrive out of order;
      `updatedAt` alone does not prevent stale writes.
- [ ] Retain pending changes for retry after connection failures and show the
      user whether progress is local, syncing, saved, or awaiting retry.
- [ ] Decide whether cloud saving should proceed when local storage is unavailable.

Completion criterion: the same signed-in user can play in one browser, resume
in another, and recover from offline play without silently losing newer progress.

### 4. Harden and make the API reproducible

- [ ] Validate JSON bodies, identifier types/lengths, and game-specific progress
      payloads; return controlled errors for malformed requests.
- [ ] Handle configuration and database failures with useful server logs and
      consistent client responses.
- [ ] Pin API dependency versions and commit an API lockfile. Both Azure packages
      currently use `latest`; the root lockfile does not lock this separate package.
- [ ] Add a documented local API development workflow and a placeholder settings
      example. `npm run start` currently serves static files only.
- [ ] Ignore local secret settings before creating them; `.gitignore` currently
      has no entry for `local.settings.json` or `.env` files.
- [ ] Document resource provisioning, runtime compatibility checks, environment
      configuration, and operational diagnostics.

### 5. Add integration coverage and deployment gates

- [ ] Test Functions validation, missing documents, Cosmos failures, and
      authentication/ownership isolation.
- [ ] Extend helper coverage for invalid JSON, error distinctions, and the chosen
      retry/conflict behavior.
- [ ] Add browser tests for cloud restore, offline recovery, sign-in transitions,
      and concurrent saves, plus a controlled real-backend round-trip check.
- [ ] Install and validate the separate API package in CI. Existing quality jobs
      install the root package; no dedicated API test workflow is present.
- [ ] Make Azure deployment depend on successful required checks. The current
      Azure deployment workflow runs separately from the quality/E2E workflow.

### 6. Expand scope after Word Quest works end to end

- [ ] Choose which additional games should sync and map their existing local
      storage formats to a shared cloud-progress contract.
- [ ] Implement or remove the unused profile-container helper. There are no
      profile endpoints or profile UI; `COSMOS_PROFILE_CONTAINER` is only needed
      if that feature is retained.
- [ ] Document API availability for each hosting mode. The same-origin cloud
      URLs require a backend; the plain static development server does not
      provide one.

## Verification performed

`node --test test/lib/cloud-progress.test.js`: **4 passed, 0 failed**.

These tests mock `fetch`; they verify helper request construction and selected
failure cases, not Azure connectivity, Functions execution, or Cosmos persistence.
No application code was changed during this audit. The next implementation
milestone should be authenticated Word Quest save-and-restore, after confirming
the existing deployment and container configuration.
