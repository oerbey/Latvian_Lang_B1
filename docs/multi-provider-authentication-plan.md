# Microsoft, Google and Email OTP Authentication Plan

> Superseded on 2026-10-07 by the [email/password Free-hosting plan](email-password-authentication-plan.md).
> The owner is the only current user and does not require account/progress preservation.
> Remaining Standard-hosting, multi-provider, linking and migration chunks are historical and must not be implemented.

## Summary

Adopt Microsoft Entra External ID as the single customer-identity broker, initially offering personal Microsoft accounts, Google accounts and email one-time code. Apple is deferred to a separate future plan.

Release the accepted Microsoft-only sync to production first through a separate manual deployment gate. Multi-provider work then runs on a new isolated Standard-plan Static Web Apps resource. A temporary migration bridge is deployed only to the old Dev preview before its workflow moves; production remains unchanged by that development.

Custom authentication requires Standard and disables preconfigured providers. Because the hosting plan applies to the whole Static Web Apps resource, the authentication lab will use a separate resource rather than upgrading the shared Free resource. [Azure custom-auth documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom), [hosting-plan documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/plans).

### Agent handoff protocol

Each numbered chunk is independently implementable and should produce one focused commit.

After every chunk, the implementing agent must:

- Update `progress.md` with the objective, decisions, completed work, test results, Azure actions and remaining tasks.
- Update `CHANGELOG.md` when behavior, infrastructure or interfaces change.
- Update the Azure integration-status document when deployment state or rollback information changes.
- Record the commit SHA and deployed environment URL.
- Stop if a prerequisite or acceptance check fails; do not continue into the next chunk.
- Never include credentials, tokens, raw user IDs or personal data in source control or logs.

## Execution Chunks

### Chunk 0 — Freeze baselines and release boundaries

- Record current Dev commit `45f54ca`, current `main` SHA, existing production deployment SHA and both environment URLs.
- Confirm the existing resource still uses:
  - `progress_dev` for the existing Dev preview.
  - `progress_prod` for production.
  - Free hosting plan.
- Run root tests, API tests, lint, formatting, typecheck, data/i18n validation and Playwright.
- Record the actual deployed production SHA as a historical baseline and inspect its authentication behavior. If it allows anonymous or browser-selected ownership, do not use it as a rollback target for an authenticated release. The first safe Microsoft-only rollback baseline is established only after Chunk 2 succeeds.
- Make no Azure authentication, Cosmos or hosting-plan changes.

Handoff condition: all checks pass and the status document contains the exact forward SHA, historical production SHA and whether a safe rollback SHA exists.

### Chunk 1 — Add a manually approved production release workflow

- Add a production workflow that:
  - Runs only through `workflow_dispatch`.
  - Refuses to deploy unless the selected ref is `main`.
  - Calls the reusable CI workflow before deployment and runs its checks against the exact requested SHA.
  - Uses a protected GitHub environment named `production`.
  - Uses `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION`.
  - Accepts an optional approved commit SHA so the same workflow can redeploy a known-good SHA for rollback.
  - Validates that the requested SHA belongs to `main`, then checks out that exact SHA for deployment.
  - Rejects commits older than the accepted authenticated Dev baseline `45f54ca`, including the historical anonymous production build.
  - Deploys with `production_branch: main`.
- Keep the existing `dev` push workflow unchanged during this chunk.
- Configure the GitHub `production` environment with the owner as required reviewer.
- Copy or regenerate the existing production resource’s deployment token into the new secret without exposing its value.

Handoff condition: workflow syntax and CI pass; no production deployment has occurred.

### Chunk 2 — Release Microsoft-only production v1

This chunk contains explicit owner actions:

1. Confirm the accepted Dev changes remain included in `main`; GitHub already reports `45f54ca` as an ancestor of `main` at the start of implementation.
2. Confirm all CI jobs pass for the exact selected `main` SHA.
3. Manually approve and dispatch the production workflow for the exact merged SHA.
4. Verify production `/api/health`.
5. Using one dedicated production account, verify sign-in, save, refresh restore and second-browser restore.
6. Using a second account, confirm the first account’s progress is inaccessible.
7. Confirm records are written only to `progress_prod`.
8. Review authentication, Functions and Cosmos logs for errors or unusual request volume.

Rollback on any failure:

- Before the first successful authenticated release, no safe authenticated rollback SHA exists. Stop new releases, disable affected cloud sync if necessary, and fix forward on `main` through the same checks and approval gate. Do not deploy the historical anonymous build as an authenticated rollback.
- Once an authenticated production build is accepted, use its recorded SHA as the rollback target for subsequent releases.
- Do not delete or modify Cosmos records during rollback.
- Record the failure and stop all subsequent chunks until reviewed.

Handoff condition: Microsoft-only production v1 is accepted and its deployed SHA is recorded.

### Chunk 3 — Add a temporary migration bridge to the old Dev preview

- Record the old Dev preview's last-known-good SHA and URL before changing it.
- Create `accounts_dev` with partition key `/pk`, default TTL enabled with no default expiry, allowing per-document TTL. Add `COSMOS_ACCOUNTS_CONTAINER=accounts_dev` only to the old Dev preview and new resource's Dev environment.
- Add a temporary authenticated `POST /api/migration/start` to the old Dev preview. It must derive identity only from the server principal, point-read that learner's legacy Word Quest progress, generate a 256-bit random token, and store only its hash plus a bounded progress snapshot, source revision, creation time and expiry in `accounts_dev`. It must not expose the old SWA user ID or allow a browser-supplied owner ID. Return the token once with `Cache-Control: no-store`. Set a 15-minute redemption expiry and a one-hour document TTL.
- Gate token issuance behind a Dev-only `MIGRATION_ISSUANCE_ENABLED` setting that defaults to disabled. Enable it only on the old Dev preview for the migration window; it must remain disabled on the isolated resource.
- Give the old Dev page a deliberate copy-token handoff and show the snapshot time. Saves made on the old site after token creation are not in that snapshot; the learner must generate a new token to include them.
- Deploy and verify this additive bridge on the old Dev preview while its existing workflow still targets the shared resource. Confirm the old Microsoft sign-in, sync, anonymous rejection and account isolation still work. Record the bridge build SHA and URL as the migration fallback.

Handoff condition: the old Dev bridge issues a token only for the authenticated learner's progress, and the old Microsoft-only sync and isolation checks still pass. Record its deployed SHA and URL.

### Chunk 4 — Create the isolated authentication Dev environment

- Create Static Web Apps resource `latvian-auth-dev-014d1e` in resource group `AZ-myWebApp`.
- Select the Standard hosting plan.
- Keep `main` as its declared production branch, but deploy the repository’s `dev` branch only as its stable branch-preview environment.
- Add GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN_AUTH_DEV`.
- Repoint the existing Dev deployment workflow to the new secret/resource only after the bridge deployment and verification. Stop automatic deployments to the old Dev preview while retaining its bridge build for migration and rollback.
- Configure the new resource’s `dev` environment with:
  - Existing Cosmos endpoint and database.
  - `COSMOS_PROGRESS_CONTAINER=progress_dev`.
  - `COSMOS_ACCOUNTS_CONTAINER=accounts_dev`.
- Do not use or modify `profiles_dev`; its existing naming mismatch remains out of scope.
- Deploy the existing Microsoft-only build to the new resource and verify anonymous API rejection before adding External ID.

Azure Static Web Apps settings must be created specifically for the new Dev environment. [Environment-setting guidance](https://learn.microsoft.com/en-us/azure/static-web-apps/application-settings).

Handoff condition: the isolated Standard Dev URL serves the current app, uses only Dev containers, has migration issuance disabled and passes the existing anonymous verifier. Record its deployed SHA and URL.

### Chunk 5 — Introduce canonical application accounts

Keep Microsoft authentication unchanged during this chunk.

#### Account records

Use `accounts_dev` for five document types:

- Identity alias:
  - `id` and `pk`: `identity:<sha256(provider + "\0" + swaUserId)>`.
  - For the new resource, `provider` is the SWA broker name `externalId`, not the underlying Microsoft, Google or email sign-in method. Distinct sign-ins have distinct SWA IDs and must be linked by proof.
  - Fields: `type`, `accountId`, normalized SWA provider, timestamps and schema version.
  - Do not store the raw Static Web Apps user ID.
- Account:
  - `id` and `pk`: `account:<uuid>`
  - Fields: `type`, `accountId`, linked identity keys/providers, status, timestamps and schema version.
- Link operation:
  - `id` and `pk`: `link:<sha256(rawToken)>`
  - Fields: source account, status, expiry, attempt count and operation metadata.
  - Store only the token hash.
- Legacy migration operation:
  - `id` and `pk`: `migration:<sha256(rawToken)>`.
  - Store the old Dev server-created progress snapshot and revision, expiry, status, attempt count and operation metadata. Use per-document TTL to remove abandoned operations; do not store the old raw SWA user ID.
- Progress archive:
  - `id` and `pk`: `archive:<operationId>:word-quest:<accountId>`
  - Store the losing progress copy with a 30-day TTL.

#### Account resolution

- Compute the identity alias key exclusively from the server-provided principal.
- Resolve the alias with a Cosmos point read.
- On first use:
  1. Generate a UUID account ID.
  2. Attempt to create the alias first.
  3. If another request wins, read and use the winner.
  4. Create the account document idempotently.
- Never derive, merge or recover an account using email address alone.
- Never assume an underlying sign-in method can be identified from the new resource's `identityProvider`: all three methods arrive through `externalId`. Provider labels are displayed only when they come from a verified server-side source.

#### Progress ownership version 2

- Resolve `accountId` before every progress read or write.
- Continue using the existing `/userId` Cosmos partition property, but set its value to the canonical `accountId`.
- Store:
  - `accountId`.
  - `ownershipSchemaVersion: 2`.
  - `identityProvider` as the last authenticated writer.
- Preserve the existing browser API response shape; `userId` now contains the canonical account ID for compatibility.
- On first access on the same SWA resource:
  - Look for `${accountId}:${gameId}`.
  - If missing, look for the authenticated identity’s legacy `${swaUserId}:${gameId}` record.
  - Copy the legacy data and revision into the canonical record.
  - Leave the legacy record untouched as a rollback copy.
- Do not bulk-scan or bulk-migrate Cosmos.
- Old-resource progress does not qualify for this lazy lookup because the old and new SWA resources issue different user IDs. Import it only through the migration proof described in Chunks 3, 6 and 8.

Handoff condition: same-resource Microsoft users retain their Dev progress after lazy migration, other users remain isolated, and legacy records remain intact. Cross-resource migration waits for the proof flow.

### Chunk 6 — Add account-management and proof-based linking

Add authenticated routes:

- `GET /api/account`
  - Returns account status and the count of linked identities. Return method labels only if a verified server-side source is established; otherwise use a generic External ID label.
  - Does not return raw identity IDs.
- `POST /api/account/link/start`
  - Generates a 256-bit random token.
  - Stores only its hash.
  - Normal links expire after 15 minutes.
  - Returns the raw token once with `Cache-Control: no-store`.
- `POST /api/account/link/preview`
  - Accepts the token under the target authenticated session.
  - Returns source and target progress summaries and whether a choice is required.
  - Makes no mutations.
- `POST /api/account/link/complete`
  - Accepts the token and, when required, `progressChoice: "source" | "target"`.
  - Uses ETags and an idempotent `pending → processing → completed` operation state.
  - Rejects expired, reused, malformed or same-identity attempts.
- `POST /api/account/migration/preview` and `POST /api/account/migration/complete`
  - Accept an old Dev migration token under the new site's authenticated session and locate its hash by point read in `accounts_dev`.
  - Preview the old snapshot and current canonical progress without mutation. If both differ, require a whole-record choice of `legacy` or `current`.
  - On completion, archive the unselected copy, then create or conditionally replace canonical progress with a new revision. Mark the operation complete for that canonical account only. A retry by the same account resumes safely; another account cannot redeem it.
  - Recheck the current canonical revision after preview, reject expired or tampered tokens, and never accept an owner ID or progress snapshot from the browser.

Link-completion rules:

- The account that generated the token remains the surviving account.
- All target-account identity aliases transfer to the source account.
- If only one account has progress, keep that progress automatically.
- If both contain identical progress, keep the source without prompting.
- If both differ, require the user’s whole-record selection.
- Archive the unselected record before changing aliases or active progress.
- If target progress is selected, write it to the source account with a new revision.
- Mark the target account `mergedInto` the source.
- A retry must resume the same operation safely without duplicating archives or revisions.
- Never perform a field-level or email-based merge.

Add `account.html`:

- Show the External ID broker and linked-identity count. Show individual sign-in-method labels only after a verified server-side source is available.
- Provide “Add another sign-in method.”
- Store the raw link token only in `sessionStorage`.
- Provide a deliberate copy/paste handoff for link and migration tokens. A private window cannot read the original window's `sessionStorage`.
- Guide the user to open a private window or sign out and authenticate with the second method, then paste the token into that authenticated session.
- Display both progress summaries when a choice is needed.
- Add “Manage sign-in methods” beside Word Quest’s authenticated status.
- Preserve anonymous local-only play.

Handoff condition: two mocked identities can be linked safely, a mocked old Dev snapshot can be imported into a distinct new-resource identity, cross-account token replay fails, and all progress-choice branches are covered.

### Chunk 7 — Configure Entra External ID in isolated Dev

Create an external tenant and app registration using Dev-only names:

- Tenant display name: `Latvian Learners Dev`.
- Application: `Latvian Word Quest Dev`.
- Redirect URI: the isolated Dev callback `/.auth/login/externalId/callback`.
- Logout redirect: the isolated Dev Word Quest URL.
- Requested scopes: `openid profile email`; request no unrelated API permissions.

Configure one browser-delegated user flow containing:

- Email one-time passcode.
- Google.
- Personal Microsoft accounts through the supported Microsoft-account OIDC federation; do not include work or school accounts in this acceptance scope.
- Do not enable email/password.
- Do not enable Apple yet.

Configure the isolated Static Web App:

- Register External ID as custom OIDC provider `externalId`.
- Put client IDs and secrets in environment settings, never source control.
- Map `/login` to `/.auth/login/externalId`.
- Preserve `/.auth/logout`.
- Keep all progress and account APIs restricted to `authenticated`.
- The old Dev migration bridge supplies proof of the old session. Do not add `legacy-aad` to the new resource: its SWA user ID would differ from the old resource's ID and would not identify a legacy progress record.

Handoff condition: personal Microsoft, Google and email OTP each produce a valid authenticated `/.auth/me` principal and can access the account API. With dedicated test identities, confirm that each sign-in method produces a distinct SWA ID, repeat sign-in produces the same ID for the same identity, and the server principal reports `externalId` for the broker. Record only hashed comparisons, not raw IDs.

### Chunk 8 — Exercise self-service migration and linking

Run these Dev scenarios with dedicated test identities:

1. On the old Dev bridge build, sign in with the original personal Microsoft account, save progress, and generate a migration token. Record its snapshot time and revision; do not save again on the old site during the transfer.
2. On isolated Dev, sign in through External ID with the personal Microsoft account. The new SWA ID must differ from the old resource's ID. Paste the migration token into the authenticated migration flow and preview the old snapshot.
3. Redeem the token and confirm the old Word Quest progress appears under the canonical account. Confirm the old record remains untouched, token reuse by another identity fails, and the same-account retry is idempotent.
4. Link a Google identity and confirm it restores the same progress.
5. Link an email-OTP identity and confirm it restores the same progress.
6. Create two test accounts with different progress:
   - Link once choosing source progress.
   - Reset test fixtures and link once choosing target progress.
   - Confirm the losing copy is archived in both cases.
7. Verify expired, replayed, tampered and cross-user link and migration tokens fail. Verify a new token captures a later old-site save, whereas an earlier token retains its original snapshot.
8. Verify an unrelated learner cannot read, overwrite, preview or link another account.
9. Re-run refresh, second-browser, offline recovery and concurrent-edit tests.
10. Confirm anonymous users remain local-only.

After the migration window, disable new token issuance on the old Dev bridge through its Dev-only setting, let outstanding tokens expire, and record the old Dev rollback URL and bridge SHA. Retire the bridge in a separate cleanup after migration acceptance.

Handoff condition: personal Microsoft, Google and email OTP satisfy the full Dev acceptance suite with one shared canonical account, including a successful proof-based import from the old Dev resource.

### Chunk 9 — Hold and future production review

Stop after isolated Dev acceptance.

Before any multi-provider production rollout:

- Review authentication success/failure rates, link failures, Cosmos request units and archive volume.
- Deploy the canonical-account foundation to production while Microsoft-only authentication remains active.
- Let that foundation stabilize and establish it as the new rollback baseline.
- Plan and communicate a migration window for existing Microsoft-only users.
- Decide whether to upgrade the existing production resource or create a replacement Standard production resource.
- Require a separate explicit approval for production External ID configuration, production account-container creation and deployment.

## Required Tests

### Automated

- Account-key normalization and hashing.
- Concurrent first-account creation.
- Lazy migration from ownership schema 1 to 2.
- No cross-user reads or writes.
- Browser-supplied account/provider fields ignored.
- Token entropy, hashing, expiry, attempt limit and single use.
- Old Dev migration snapshot ownership, expiry, revision, later-save behavior and cross-resource redemption.
- Same-identity and already-linked rejection.
- Idempotent link completion after failures at each persistence step.
- Source/target/identical/no-progress selection cases.
- Archive creation before alias reassignment.
- Public API omits raw identity and token data.
- Existing conflict, offline retry and local-only behavior unchanged.
- Full root, API, lint, format, type, data/i18n and Playwright suites.

### Live Dev acceptance

- Personal Microsoft, Google and email OTP authentication with distinct, stable sign-in IDs.
- Proof-based old Dev progress import across SWA resources.
- Same progress through every linked provider.
- Second-browser restore.
- Offline play followed by sync.
- Concurrent revision conflict.
- Link-token expiry and replay rejection.
- Cross-account isolation.
- Cosmos writes limited to `progress_dev` and `accounts_dev`.
- No production configuration or data access during multi-provider development.

## Remaining design gate before Chunk 6

Specify and test how link and migration completion prevent concurrent saves while progress, archives, aliases and operation state are being changed across Cosmos partitions. Define the order of writes, conditional revision checks, recovery after each partial failure, and the result of a same-account retry. Do not implement Chunk 6 from the current ETag summary alone.

## Assumptions and Locked Decisions

- Current commit `45f54ca` is the starting Dev baseline.
- Microsoft-only production v1 is released first.
- Production deployment is manual and separately approved after merge.
- Multi-provider development uses a separate Standard Static Web Apps resource.
- Entra External ID is the sole long-term broker.
- Initial methods are personal Microsoft accounts, Google and email OTP. Work or school Microsoft accounts are out of scope.
- Distinct sign-in methods have distinct SWA IDs and require proof-based linking to share one canonical account. Confirm this premise with live Dev principals before finalizing account resolution.
- Apple is a separate future plan and is not part of this implementation.
- Email/password is not implemented.
- Provider identities are explicitly linked; they are never merged by email.
- Progress collisions use whole-record user choice with a recoverable archive.
- Word Quest remains the only synchronized game.
- `profiles_dev`, profile UI, additional games and multi-provider production rollout remain out of scope.
