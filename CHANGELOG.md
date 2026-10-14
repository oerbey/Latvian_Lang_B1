# Changelog

Notable changes to Latvian_Lang_B1 are recorded here. Tracking starts on
2026-09-06; earlier development remains available in Git history and `progress.md`.

## Maintaining this log

- Add an entry under **Unreleased** in the same change as meaningful application,
  data, infrastructure, or development-tooling work.
- Group entries under **Added**, **Changed**, **Fixed**, **Removed**, or
  **Security**, using only the categories needed.
- Describe the resulting behavior and any migration or configuration action.
  Link to detailed documentation when useful; keep plans in the relevant status
  document rather than recording them as completed changes.
- When releasing, move the entries into a dated section (`YYYY-MM-DD`), include
  a version or commit reference if available, and leave a fresh Unreleased section.
  Record deployment separately when it differs from the release date.
- Never include credentials, secret values, or private player data.

## Unreleased

### Changed

- Word Quest uses hosted email/password sign-in, application-token cloud sync and
  server-derived External ID ownership on its next Dev deployment. Guest and
  account progress have independent local namespaces; logout cancels stale work,
  renewal failures ask for sign-in, and conflicts require an explicit choice.
  The temporary probe APIs and legacy SWA principal authorization are retired.
- Reuse the exact registered sign-in callback as a minimal return page. Stage
  the pinned SDK through build:auth-client, precache Word Quest/public auth assets
  and keep callbacks/private APIs out of service-worker caches (v29).
- Word Quest's visual test hook now advances browser frames so UI animations and
  save timers settle before inspection. Live game acceptance remains pending.

### Fixed

- Fresh Word Quest accounts receive explicit JSON `null` for missing cloud progress,
  avoiding an empty Azure Functions response that blocked initial cloud sync.
  Regression verification uses the installed Functions response serializer;
  deployment and owner acceptance remain pending.
- API access tokens use a dedicated application header to avoid the managed
  Static Web Apps gateway overwriting Authorization. Full JWT checks remain
  enforced; the owner accepted the standalone token path on Free on 2026-10-14.
  Live Word Quest save/restore acceptance remains pending.
- Sign-in callbacks show safe error codes and a return path instead of reporting
  that authentication is disabled. Raw error details, accounts and tokens remain
  hidden; sign-in discovery trusts the configured named and GUID issuer hosts.

### Added

- Public application authentication configuration and a token-validated session
  endpoint returning only the server-derived owner key for local namespaces.
- Reproducible pinned MSAL bundle/license staging for Dev deployment and local
  startup/browser checks. Customer tenant/apps/user flow and Dev settings were
  accepted through the standalone probe; game integration deployment is pending.

### Removed

- Retired the temporary Dev migration endpoint, token panel, accounts-container
  helper and migration-only tests. Dev issuance is disabled and its accounts
  setting removed; deployed on Dev at `7ebbff8` on 2026-10-11. Microsoft
  sign-in and normal cloud sync were retained in that retirement build.
  Production still uses that authentication model; the next Dev change is above.

### Added

- Temporary old Dev migration bridge for authenticated Word Quest cloud
  snapshots, with a private 15-minute proof token, hashed operation storage,
  one-hour operation TTL and a deliberate copy-token handoff. Issuance defaults
  to disabled. Deployed to old Dev on 2026-10-07 at `6b8c377` and configured
  its accounts container. Enabled issuance on old Dev after owner-confirmed
  save/restore acceptance; live generation/copy and Cosmos metadata checks passed.
  Live two-account isolation remains deferred with owner authorization.

- Dev-only Azure integration diagnostic, run with `npm run verify:cloud:dev`.
  It checks API health and confirms anonymous progress access is blocked. It is
  read-only and targets the fixed dev deployment.
- API authentication, validation, revision-conflict handling, and handler tests.
- Authenticated Word Quest cloud restore, conflict choice, retry handling, and
  visible sync status.
- [Azure Cosmos DB integration status](docs/azure-cosmos-integration-status.md),
  documenting development history, verified portal settings, live verification,
  and remaining implementation work.
- This changelog and contributor guidance for recording future changes.

### Changed

- Word Quest now uses Microsoft Entra authentication through Azure Static Web
  Apps and derives progress ownership from the server-provided principal.
- New progress writes retain the server-provided identity provider and ownership
  schema version as private Cosmos metadata, preparing for a future canonical
  account migration without changing the current `/userId` partition strategy.
- Azure deployment is dev-only and runs after the reusable quality, API, and E2E
  checks. No production deployment is enabled by this change.
- Azure API dependencies are pinned with a separate lockfile compatible with the
  configured Node 20 runtime.
- Root coverage now scopes discovery to the root test suite so API tests remain
  covered by their separate API CI job.
- Theme changes now synchronize `<html>` and `<body>`, allowing shared dark game
  palettes to activate consistently. Sentence Surgery contrast checks now use
  the real theme control, wait for computed theme tokens, and handle
  runner-dependent computed CSS color formats.

### Security

- Anonymous progress reads and writes are rejected; browser-supplied `userId`
  values are no longer accepted.
- Identity-provider metadata is derived only from the authenticated server
  principal and is not included in public progress API responses.

### Verification notes — 2026-09-06

- The pre-auth live dev create/read/update/read verification passed. It retained
  one isolated disposable record per run because the old API had no delete endpoint.
- The current dev verifier is read-only and does not create diagnostic records.
- The verifier accepts either API JSON or Azure Static Web Apps' platform HTML
  for an expected HTTP 401 authentication gate.
- The owner confirmed authenticated Dev sign-in, Word Quest cloud save, restore,
  conflict handling, offline retry, and cross-account isolation.
- On 2026-09-14 it reached dev health successfully, then stopped when the
  currently deployed pre-auth API returned HTTP 200 instead of the new
  unauthenticated-gate expectation of HTTP 401; no write request was made.
- Production health returned HTTP 200. Production database writes were not tested.
- All 152 Node tests passed; lint and formatting checks passed for the diagnostic
  files. These results apply to the Azure verification changes, not a new deployment.
- The deployed API returns an empty HTTP 200 body for missing records. The
  diagnostic accepts this only for the initial missing-record lookup.
- Profile-container settings still use singular names while Cosmos containers
  use plural names. The profile integration remains deferred; see the
  integration status document for the dev-only rollout state.
