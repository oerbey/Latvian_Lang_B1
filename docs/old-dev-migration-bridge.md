# Old Dev migration bridge

## Status — 2026-10-01

Implemented on `feature/old-dev-migration-bridge`, based on the accepted Dev SHA
`45f54ca6d8fc351c0cf51e2ca262086a58661a1e`. Deployment and live acceptance are
pending. The old Dev URL remains:
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
- No progress records, production settings or hosting plan were edited.

Pending on the **old Dev environment only**:

1. Add `COSMOS_ACCOUNTS_CONTAINER=accounts_dev`.
2. Merge the bridge PR into `dev`, letting the existing Dev workflow run its
   checks and deploy to the shared Free SWA resource. Do not repoint that workflow.
3. Verify health, anonymous progress rejection and anonymous migration rejection.
4. For the dedicated Dev account, verify its normal save/restore still works.
5. Set `MIGRATION_ISSUANCE_ENABLED=true` on old Dev for the migration window.
6. Generate a token, confirm capture/expiry information and copy it privately.
   Do not paste the token into a PR, log or chat. Verify the stored operation
   using metadata/counts without exposing player identities or the raw token.
7. Record the bridge deployment SHA as the frozen old Dev fallback before
   continuing to the isolated lab resource.

The new lab does not exist yet. Add `COSMOS_ACCOUNTS_CONTAINER=accounts_dev` to
its Dev environment when Chunk 4 creates it, while leaving issuance disabled.
Do not add either setting to production.

Embedded Azure environment-variable controls could not be operated through the
available browser controls, and access to the native Brave fallback was not
approved. These application settings were not changed. This is an access
limitation, not a failed Azure configuration write.

## Recovery and acceptance limits

Disable `MIGRATION_ISSUANCE_ENABLED` if issuance fails acceptance. Existing
Microsoft-only sync does not require the accounts container. If needed, revert
the bridge on `dev` and let the gated Dev workflow redeploy the accepted code;
the pre-bridge fallback SHA is recorded above. Leave progress records intact.

Chunk 3 is not complete until deployment and live token issuance are verified.
Live two-account isolation is still deferred because only one dedicated account
is available; API tests cover separate server identities without claiming a
live two-account acceptance result. Do not begin Chunk 4 yet.
