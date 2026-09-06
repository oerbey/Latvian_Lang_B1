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
  It checks API health, missing-game validation, missing records, and exact
  save/read and update/read round trips, including Latvian text. Requests target
  the fixed dev deployment, reject redirects, and time out after 20 seconds.
- Four diagnostic tests covering successful create/update, stale reads, health
  failures before writing, and empty-body responses.
- [Azure Cosmos DB integration status](docs/azure-cosmos-integration-status.md),
  documenting development history, verified portal settings, live verification,
  and remaining implementation work.
- This changelog and contributor guidance for recording future changes.

### Verification notes — 2026-09-06

- Live dev create/read/update/read verification passed. The diagnostic retains
  one isolated disposable record per run because the API has no delete endpoint.
- Production health returned HTTP 200. Production database writes were not tested.
- All 152 Node tests passed; lint and formatting checks passed for the diagnostic
  files. These results apply to the Azure verification changes, not a new deployment.
- The deployed API returns an empty HTTP 200 body for missing records. The
  diagnostic accepts this only for the initial missing-record lookup.
- Profile-container settings still use singular names while Cosmos containers
  use plural names. Authentication and cloud restore remain unfinished; see the
  integration status document for the remaining work.
