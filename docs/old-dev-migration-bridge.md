# Old Dev migration bridge

> Historical rollout: the owner subsequently chose email/password-only accounts
> with no preservation of existing accounts/progress. Remaining work follows the
> [replacement implementation plan](email-password-authentication-plan.md).
> This guide records what was deployed; migration is no longer required.

## Retirement — 2026-10-07

Saved and verified `MIGRATION_ISSUANCE_ENABLED=false` on Dev and removed its
`COSMOS_ACCOUNTS_CONTAINER` setting. `progress_dev` remains the progress container.
No records, containers or production settings were changed. Issuance is disabled
even while the existing bridge build is still deployed.

Removed the bridge endpoint, UI/module/styles, accounts helper, migration tests
and route from the retirement branch; code removal awaits its Dev merge/deployment.
Service-worker version v27 removes the obsolete module while retaining cloud-sync
precaching. Current Microsoft sign-in and progress authentication remain intact.

The deployment-freeze instructions below and in draft PR #203 are superseded:
the existing Free Dev workflow can deploy the retirement build to the same URL.
Keep the following sections as historical acceptance evidence, not rollout steps.

## Status — 2026-10-07

Implemented on `feature/old-dev-migration-bridge`, based on the accepted Dev SHA
`45f54ca6d8fc351c0cf51e2ca262086a58661a1e`. PR #202 was merged and Dev deployment
of `6b8c377c3298121cb6d1985be5e5bf15c9354548` succeeded in
[run 37664952672](https://github.com/oerbey/Latvian_Lang_B1/actions/runs/37664952672).
The matching CI run passed. Live acceptance passed with the previously authorized
two-account isolation deferral. This SHA is the accepted old Dev migration fallback.
The old Dev URL remains:
`https://red-ocean-014d1e603-dev.westeurope.4.azurestaticapps.net`.

Production was accepted with documented verification deferrals before this
chunk. The owner explicitly deferred live two-account isolation and authorized
Step 3. Production placement passed with read-only aggregate counts; historical
request telemetry was unavailable because collection was disabled. See
[production acceptance PR #201](https://github.com/oerbey/Latvian_Lang_B1/pull/201).

## Implemented behavior

- `POST /api/migration/start` requires SWA authentication and the old Dev origin.
- Issuance defaults to disabled. It requires the exact string `true` in
  `MIGRATION_ISSUANCE_ENABLED`, `progress_dev` in `COSMOS_PROGRESS_CONTAINER`,
  and `accounts_dev` in `COSMOS_ACCOUNTS_CONTAINER`. Production container
  settings fail closed even if issuance is accidentally enabled.
- The request body must be `{}`. Browser-supplied identities and snapshots are
  rejected. The server point-reads the principal's saved Word Quest record.
- Saved data is validated with the existing 64 KiB Word Quest limit. The
  document's revision must be a nonnegative safe integer; legacy missing
  revisions are captured as zero. Missing or invalid progress creates no proof.
- The server generates a 256-bit random base64url token. Only its SHA-256 hash
  is retained in the operation's `id` and `/pk` partition key, both prefixed
  `migration:`. No raw SWA identity is retained in the operation or response.
- Operation fields: `type: migration`, `schemaVersion: 1`, `gameId: word-quest`,
  `snapshot`, `sourceRevision`, `createdAt`, `expiresAt`, `status: pending`,
  `attemptCount: 0`, and `ttl: 3600`. Redemption expires after 15 minutes;
  per-document TTL removes the operation after one hour. Future redemption
  handlers must enforce `expiresAt` independently of Cosmos TTL.
- The token is returned once with `Cache-Control: no-store`. It stays only in
  the current page and is copied only after the learner clicks Copy. Expiry,
  sign-out and failed regeneration clear the visible token. The token is not
  placed in a URL or browser storage.
- The old Dev Word Quest title page shows a collapsed migration panel only to
  signed-in learners. Generation is disabled while cloud sync is not ready.
  It shows capture/expiry times, explains the snapshot does not include later
  saves, and states that the future site's import flow is not available yet.
- Other origins, including production and the future lab, hide this panel.
  Existing login and cloud-save behavior is unchanged by the bridge.
- The service worker cache version is bumped and the imported modules are
  precached, so existing visitors receive the bridge and guests can still play
  offline.

## Azure setup

Completed:

- Created `llb1/accounts_dev` in the existing Cosmos account.
- Partition key `/pk`, automatic indexing, existing shared database throughput
  (no dedicated container throughput added).
- TTL saved as **On (no default)** and verified after reloading the explorer.
- No production settings or hosting plan were edited. The owner used the
  dedicated Dev account for normal progress saves and token issuance.
- Saved and verified `COSMOS_ACCOUNTS_CONTAINER=accounts_dev` on old Dev only
  on October 7; `COSMOS_PROGRESS_CONTAINER=progress_dev` remains selected.
- Live API health, anonymous progress GET/POST rejection and anonymous migration
  POST rejection passed (401). Guest UI contains the bridge panel but hides it.

Live authenticated acceptance on **old Dev only**, October 7:

- Owner confirmed sign-in, progress save and refresh restore passed.
- Saved and verified `MIGRATION_ISSUANCE_ENABLED=true` for the migration window.
- Owner confirmed token generation, snapshot/expiry messaging and explicit copy.
  No raw token was supplied to this chat or stored in source control.
- A metadata-only Cosmos query returned one operation: creation
  `2026-10-07T18:26:29.742Z`, expiry `2026-10-07T18:41:29.742Z`, TTL 3600,
  source revision 8, pending status, attempt count 0, schema version 1 and
  Word Quest game ID. No snapshot or identity values were read.
- Aggregate count returned 1 for the same day's operations with `migration:`
  prefixed 74-character keys, equal `id`/`pk`, TTL 3600, and no `token` or
  `userId` property. Hash generation itself is covered by the API tests.
- Accepted fallback: `6b8c377c3298121cb6d1985be5e5bf15c9354548` at the old Dev URL.
  Chunk 4 must redirect automatic Dev deployments before merging further code;
  retain this build on the shared resource.

The new lab does not exist yet. The owner explicitly held creation of the paid
Standard resource on October 7 after reviewing the US$9/month base hosting cost
plus applicable taxes/currency conversion and usage charges. The creation form
was prepared but not submitted. No new deployment secret was transferred and
the Dev workflow was not repointed. Keep this acceptance documentation as a
draft until the workflow can be redirected; merging into Dev now would deploy
again to the old preview. Resume Chunk 4 only when the owner releases this hold.

Add `COSMOS_ACCOUNTS_CONTAINER=accounts_dev` to
its Dev environment when Chunk 4 creates it, while leaving issuance disabled.
Do not add either setting to production.

The October 1 browser-control limitation was resolved in the October 7 session.
The accounts and issuance settings were saved through Azure Portal and verified.

## Recovery and acceptance limits

Disable `MIGRATION_ISSUANCE_ENABLED` if issuance fails acceptance. Existing
Microsoft-only sync does not require the accounts container. If needed, revert
the bridge on `dev` and let the gated Dev workflow redeploy the accepted code;
the pre-bridge fallback SHA is recorded above. Leave progress records intact.

Chunk 3's deployment and available live acceptance are complete.
Live two-account isolation is still deferred because only one dedicated account
is available; API tests cover separate server identities without claiming a
live two-account acceptance result. Chunk 4's technical prerequisite has passed,
but paid resource creation is on hold at the owner's request.
