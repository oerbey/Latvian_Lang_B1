# Azure Cosmos DB integration: status and remaining work

Reviewed on 2026-09-15 against dev commit `c92757d`.

The repository now contains a dev-only authenticated Azure Static Web Apps /
Azure Functions / Cosmos DB progress-sync implementation for Word Quest. No
production settings, records, or deployments were changed for this milestone.
There is no Cognos integration in the inspected code; this report assumes “Azure
Cognos” refers to Cosmos DB.

## Dev-only implementation — 2026-09-14

- Microsoft Entra authentication uses the Static Web Apps client principal; API
  ownership is derived server-side and browser-supplied user IDs are rejected.
- Word Quest remains local-first for guests and restores authenticated cloud
  progress with an explicit local-versus-cloud conflict choice.
- Saves are revisioned, serialized, retried, and surfaced through sync status;
  malformed requests and Cosmos failures receive controlled API responses.
- The Azure workflow now deploys only from `dev` after reusable quality, API, and
  E2E checks. Production deployment remains disabled by this change.
- The live verifier is read-only and checks dev health plus anonymous API gates;
  authenticated save/restore acceptance must use a dedicated dev test account.

The initial repository audit was followed by a read-only Azure portal review on
2026-09-06. The verified settings and remaining verification limits are recorded
below. That portal review changed no Azure settings or database records. The
historical pre-auth dev diagnostic created one isolated test record; the current
dev verifier is read-only.

## Historical pre-auth live verification — 2026-09-06

The pre-auth diagnostic was run against the dev URL confirmed through Azure's
Environments page:
`https://red-ocean-014d1e603-dev.westeurope.4.azurestaticapps.net`.

The live run passed API health, missing-game validation, missing-record lookup,
initial save/read, and update/read. Each read matched the complete saved payload,
including Latvian characters and nested data. This confirmed dev API-to-Cosmos
read/write connectivity for the anonymous prototype at that time. A separate
read-only production health check also returned HTTP 200 with the expected body;
production database writes were not tested. These results are historical and do
not represent the authenticated implementation now in the working tree.

Each diagnostic run uses a random `integration-check-<UUID>` user and game ID
`integration-check`. It does not use `demo-user` or a player's Word Quest record.
Redirects are rejected and requests time out after 20 seconds. The diagnostic
is opt-in and is not included in normal tests or CI because it writes to Azure.
It checks the current anonymous prototype contract and must be revised when
authentication is introduced; do not bypass authentication to keep it passing.

One disposable record remains in `llb1/progress_dev` because no deletion endpoint
exists. Successful run document ID:
`integration-check-f785461a-3371-432a-9250-2bbef1b7620e:integration-check`.
Future pre-auth runs also retained one small record each and printed its ID even
if a later step failed. These can be reviewed and removed manually in Data
Explorer.

Observed pre-auth response quirk: a missing document returned HTTP 200 with an
empty body and no JSON content type. The current API normalizes a missing record
to JSON `null`; saved records must return valid JSON and exact data.

Four local diagnostic tests covered successful create/update, stale reads,
health failures before writing, and empty-body behavior. The authenticated
implementation replaces that write-capable diagnostic with the current
read-only dev verifier plus API and browser tests. The profile-container naming
correction remains deferred because profile synchronization is out of scope.

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
| 2026-09-14 | `c92757d`            | Deployed dev-only Entra ownership, Word Quest restore/sync, API tests, and gated dev deployment.      |

The 2026-09-14 implementation is live in the `dev` preview. The read-only
verifier passes API health and confirms that anonymous Word Quest reads and
writes both return HTTP 401. The authenticated Dev acceptance flow has since
been confirmed by the owner: sign-in, cloud save, cross-browser restore, and
account isolation worked against Dev. No production settings, records, or
deployments were changed.

### Backend and deployment

- `api/src/lib/cosmos.js` lazily creates a Cosmos client using required environment
  variables and exposes only the progress container for this milestone.
- `api/src/lib/auth.js` validates the authenticated Static Web Apps principal and
  supplies the server-derived user ID to handlers.
- `api/src/lib/progress-validation.js` limits the API to validated Word Quest
  payloads and a 64 KiB serialized state.
- `GET /api/health` returns a static API-health response. It does not test Cosmos
  connectivity.
- `POST /api/saveProgress` requires an authenticated principal, validates the
  request, and writes a revisioned document with a server-generated timestamp.
- `GET /api/getProgress` derives the document identity from the authenticated
  principal and returns `null` if the record is missing.
- Documents use the ID `${userId}:${gameId}`; reads pass `userId` as the partition
  key value, so the container configuration must match that assumption.
- New writes also store the server-derived `identityProvider` and
  `ownershipSchemaVersion: 1`. Version 1 explicitly means ownership remains tied
  to the Static Web Apps app-scoped `userId`; these private fields are omitted
  from API responses and provide migration context for a future canonical
  account ID.
- Existing documents do not require a bulk migration. They acquire the version 1
  ownership metadata on their next successful save.
- `.github/workflows/azure-static-web-apps-red-ocean-014d1e603.yml` deploys only
  `dev`, after the reusable quality, API, and E2E workflow succeeds.
- `staticwebapp.config.json` specifies Node 20, Entra login/logout routes, and
  authenticated API route restrictions.

### Browser integration

- `src/lib/cloud-progress.js` provides current-user, cloud-load, and revisioned
  cloud-save helpers with explicit auth, conflict, and availability statuses.
- `src/games/word-quest/main.js` saves locally first, restores cloud state for
  authenticated users, prompts on conflicts, queues one upload at a time, and
  retries transient failures.
- Guests remain local-only. Word Quest is the only game currently using cloud
  sync.

## Remaining work, in recommended order

### 1. Deploy and accept the dev implementation

- [x] Deploy the authenticated implementation and confirm anonymous dev reads
      and writes are blocked.
- [x] Confirm the Dev environment exposes the authenticated principal to the
      managed Functions.
- [x] Run authenticated Dev acceptance with a dedicated test account: sign-in,
      save, restore, conflict choice, offline retry, and cross-user isolation.
- [ ] Review Dev logs, Cosmos revisions, sync failures, and user feedback.

### 2. Production hold

- [ ] Do not change production settings, records, authentication, or deployment.
- [ ] Do not merge the dev implementation into `main` until explicit approval.
- [ ] Before a future multi-provider rollout, define a canonical application
      account ID and a proof-based identity-linking flow; never merge identities
      automatically by matching email addresses.
- [ ] If dev acceptance fails, redeploy the recorded pre-change dev commit
      `6d0fd82` or revert the dev implementation commits.

### 3. Deferred scope

- [ ] Additional game synchronization.
- [ ] Profile endpoints, profile UI, and profile containers.
- [ ] Any production rollout or production data migration.

## Verification performed

Root tests, API tests, lint, formatting, and Word Quest E2E smoke tests pass for
the implementation. The live verifier is intentionally read-only and has not
been run against production. Against the deployed Dev preview it passed health
and both anonymous authentication gates. The owner subsequently confirmed the
authenticated Dev save and restore flow, including cross-account isolation.
The authenticated acceptance result is user-reported; the verifier itself does
not write Cosmos records.

The automated tests mock browser/API boundaries and do not replace authenticated
dev acceptance. No production settings, records, or deployment were touched.
