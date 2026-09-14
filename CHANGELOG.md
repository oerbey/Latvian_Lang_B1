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

### Added

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
- Azure deployment is dev-only and runs after the reusable quality, API, and E2E
  checks. No production deployment is enabled by this change.
- Azure API dependencies are pinned with a separate lockfile compatible with the
  configured Node 20 runtime.

### Security

- Anonymous progress reads and writes are rejected; browser-supplied `userId`
  values are no longer accepted.

### Verification notes — 2026-09-06

- The pre-auth live dev create/read/update/read verification passed. It retained
  one isolated disposable record per run because the old API had no delete endpoint.
- The current dev verifier is read-only and does not create diagnostic records.
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
