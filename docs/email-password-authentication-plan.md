# Email/password authentication on Free hosting

## Status and decisions — 2026-10-07

This is the replacement implementation plan for the email/password-only release.
It supersedes the multi-provider authentication plan's remaining implementation
chunks and the paid-resource hold in draft PR #203. Planning does not change the
live app, Azure settings, accounts or progress.

The owner is currently the only user and explicitly does not require preservation
of existing accounts or progress. New accounts can start fresh. There is no
account linking, progress import, canonical-account registry or migration window
in this release. This permission removes migration work; it does not require
deleting existing database records or identity-provider accounts.

### Product scope

- Email/password account creation, email verification, sign-in, sign-out and
  self-service password reset.
- Microsoft Entra External ID manages credentials and the hosted account pages.
  Registration/reset may use email verification codes; email OTP is not offered
  as a normal sign-in method.
- The game has a clear Sign in / Create account entry point, account status,
  sign-out and the existing cloud-save status messages.
- Guests can continue to play locally and offline. Signed-in Word Quest progress
  saves and restores across browsers.
- Microsoft social login, Google, Apple and provider/account linking are outside
  this release. Existing Microsoft login is replaced at production cutover.
- No custom password database, password processing API or custom email sender.
- Other games' existing local progress behavior is outside this release.

## Architecture and cost boundary

Retain the existing `Latvian` Static Web Apps resource on Free, its production
URL and its stable `dev` preview. Keep the existing managed Node Functions and
Cosmos database `llb1`, using `progress_dev` in Dev and `progress_prod` in production.
Do not create `latvian-auth-dev-014d1e` or repoint the deployment token/workflow.

Use an External ID **external/customer tenant**, a hosted email/password user
flow and the supported MSAL browser library. The frontend signs in directly with
External ID using authorization code flow with PKCE. It obtains an access token
for our progress API and sends it in the HTTPS Authorization header.

Azure's built-in custom OIDC authentication is not used. There is no custom
`auth` provider configuration in `staticwebapp.config.json`. Free SWA remains the
host; authentication and authorization are enforced by the application API.

External ID Basic includes 50,000 monthly active users at no charge. Use the
ongoing Basic allocation rather than relying on a temporary trial. Link the
tenant to the existing Azure subscription as required. Avoid paid add-ons, SMS
and enterprise edge. This avoids the Standard hosting fee, but does not promise
zero Azure bills: existing Functions/Cosmos usage and service quotas still apply.
Confirm the actual selected features and billing configuration before rollout.

### Environment separation

- Use separate Dev and production SPA/API app registrations and scopes in the
  customer tenant. The Dev token audience must never authorize production APIs.
- Register exact HTTPS callback and post-logout URLs for each environment, plus
  an explicit localhost callback for development. Do not allow wildcard callbacks.
- The SPA is a public client and has no client secret.
- Store issuer, expected tenant ID, API audience, allowed SPA client ID and
  required delegated scope in environment-specific API settings.
- Add `GET /api/authConfig` returning only approved public frontend configuration
  (authority, SPA client ID, callback URL and scope). Never expose Cosmos settings
  or credentials. Fail clearly when required configuration is absent.
- Initialize authentication before cloud sync. Preserve local guest play if the
  identity provider or configuration endpoint is unavailable.

### API trust and progress ownership

- Replace `requireClientPrincipal` with an asynchronous access-token validator
  backed by a maintained JWT library compatible with the configured Node runtime.
- Resolve signing keys from the configured trusted issuer's discovery/JWKS
  endpoints, with caching, key rotation, timeouts and controlled errors. Never
  choose a key URL or trusted issuer from unverified token contents.
- Validate signature, allowed algorithm, exact issuer/tenant, API audience,
  expiry/not-before, delegated progress scope and authorized SPA client ID.
- Require a verified user `oid` claim. Derive an internal owner key as
  `extid:` plus SHA-256 of verified tenant ID, a NUL separator and verified `oid`.
  Never derive ownership from email, request JSON, browser IDs or ID tokens.
- Keep the existing progress ID shape `${ownerKey}:word-quest` and `/userId`
  partition key, assigning `userId` the derived owner key. No new accounts
  container, aliases or database repartitioning are necessary.
- Ignore the old SWA principal as an authorization mechanism. Old cookies and
  `x-ms-client-principal` alone must not grant access in the new build.
- Remove SWA `authenticated` role requirements from progress routes **in the same
  deployable change** that requires valid bearer tokens in both handlers. The
  gateway allows requests to reach the handlers; the handlers still return 401
  without valid authentication and 403 for valid tokens lacking permission.
- Preserve current bounded payload validation, revision checks, controlled
  storage errors and server-derived ownership metadata. Update metadata to reflect
  the new ownership scheme without returning private identity claims to clients.
- MSAL owns token caching; use its documented session cache and refresh behavior.
  Do not implement another token store, put tokens in URLs/logs, or cache auth/API
  responses in the service worker. ID tokens are never accepted by the progress API.

## Implementation chunks

### 1. Retire the superseded migration work and confirm Free configuration

October 7 implementation status: Dev issuance is disabled and the accounts
setting removed. Retirement code and historical-plan/status updates are prepared
on `feature/retire-migration-setup`; endpoint/panel removal awaits Dev deployment.
The existing Free deployment workflow and Microsoft sync remain in place.

- Record current Dev/production SHAs, URLs, plan and container settings.
- Disable `MIGRATION_ISSUANCE_ENABLED` on old Dev; migration is no longer required.
- Mark the old plan, bridge guide and PR #203 as historical/superseded. Incorporate
  relevant acceptance history into the new work rather than merging obsolete
  deployment instructions unchanged.
- Remove the migration function, panel, tests, accounts-container helper
  and obsolete settings in the retirement build. Existing unused records/containers
  can remain; destructive cleanup is not a prerequisite.
- Keep live production authentication unchanged during Dev implementation.

**Gate:** the Free deployment boundary and replacement scope are recorded; no
paid resource, new hosting fee or account-migration dependency remains.

### 2. Configure External ID and prove the Free API path

- Create/configure the customer tenant, Dev SPA/API registrations and delegated
  progress permission. Configure hosted email/password registration, verification
  and self-service password reset. Do not enable social sign-in methods.
- Configure consent and callback URLs. Verify the discovery issuer, token
  audience, delegated scope, tenant and user claims with the actual Dev setup;
  record only non-sensitive settings and pass/fail results.
- Build a minimal Dev integration proving MSAL can obtain a progress API access
  token and a managed Function on Free can validate it through cached JWKS. Use
  a temporary `/api/authProbe` that returns only acceptance status and does not
  read/write progress or expose claims. Keep the existing progress route gates
  and handlers intact until the atomic replacement in Chunk 3.
- Let only the probe reach its JWT validator without a SWA role gate; verify
  missing/invalid tokens are rejected. Stop and resolve any platform limitation
  before developing the full flow. Remove the probe after the feasibility gate.

**Gate:** hosted sign-up/login/reset work, the Free API accepts the intended access
token, and wrong audience/issuer/expiry/scope and ID tokens are rejected. A failure
does not authorize upgrading the hosting plan.

### 3. Implement application sign-in and progress ownership

- Add the public auth configuration endpoint and MSAL frontend helper; vendor the
  pinned dependency through the existing static build pipeline.
- Handle callback completion, session restoration, silent token renewal,
  interaction-required errors, cancelled login and provider logout.
- Replace `/.auth/me` and `/login`/`/logout` Microsoft redirects in the new flow.
  Set stable hosted-flow callbacks and return the player to Word Quest.
- Attach API access tokens to cloud load/save requests; never retry a progress
  write blindly after a revision conflict or failed authentication.
- Implement the validator/owner-key contract above. No dual legacy/new auth fallback.
- Namespace local signed-in state by owner key. On sign-out/account switch, cancel
  pending saves and ignore stale responses so one account's data cannot appear in
  another account or be uploaded under another token. Guests retain a separate
  local namespace. Ignore old local keys without requiring a data migration.
- Confirm the retired migration bridge stays removed. Bump the service worker
  cache and precache required modules; keep auth callbacks and API
  traffic online-only. Show a clear fresh-account state when cloud progress is absent.

**Gate:** email/password accounts own independent progress; registration, login,
logout, refresh and token renewal behave correctly, while guests still play offline.

### 4. Automated and live Dev acceptance

- API tests: signed valid token, absent/invalid signature, wrong issuer/tenant/
  audience/client/scope, expired/not-yet-valid token, ID token rejection, missing
  user claim, forged SWA principal, browser-supplied owner, two owners, revision
  conflicts and JWKS/storage failure. Mock signing keys; use no live credentials.
- Browser tests: sign-in/callback outcomes, cancellation, configuration/provider
  failure, renewal, expiry, logout, guest offline behavior, account switching and
  stale cloud responses. Inspect desktop and mobile UI and console errors.
- Run required repo gates: root/API tests, lint, format, typecheck, data/i18n
  validation and full Playwright before the implementation PR.
- Owner performs real email verification, login, password reset, save, refresh
  restore and second-browser restore. Passwords, codes and tokens stay private.
- Use two temporary email/password accounts to verify live isolation. They need
  not be old Microsoft accounts; automated two-identity tests remain mandatory.
  If a second real email is unavailable, record the exact limitation before release.
- Verify production still runs its existing authenticated build and Dev writes
  remain in `progress_dev`, using metadata/counts without displaying player data.

**Gate:** all automated checks and available live acceptance pass, with any
remaining live-test limit explicitly documented for the release decision.

### 5. Production cutover on Free

- Configure separate production SPA/API registrations, exact production callback
  URLs and production issuer/audience/scope/client settings. Retain `progress_prod`.
- Merge the accepted implementation and deploy through the existing manually
  approved production release workflow. Keep Free hosting and the existing URL.
- Verify registration/email verification/login/reset/logout, anonymous rejection,
  save/refresh/second-browser restore and production record placement.
- Existing Microsoft accounts/progress are not migrated. The owner creates a new
  email/password account and starts fresh. No compatibility period is necessary.
- Record the deployed SHA, URLs, configuration keys, acceptance and usage limits.
- Recovery: redeploy the recorded Microsoft-only SHA and restore its matching
  settings/route behavior, or fix forward. New email/password progress does not
  need to be visible through the old build. Never restore by weakening token checks.

**Gate:** production email/password login and cloud sync are accepted on Free.

## Completion checklist

- Users can create a verified account, sign in, reset a password and sign out.
- Authenticated Word Quest progress saves/restores and is isolated per account.
- Guests can play locally/offline without sign-in.
- No passwords or client secrets exist in frontend code or our progress database.
- No Standard resource, paid authentication add-on, migration/linking service or
  social provider is required by this release.
- Deployment/recovery settings, Free-tier limits and acceptance evidence are documented.

## Primary references

- [External ID setup and email/password user flows](https://learn.microsoft.com/en-us/entra/external-id/customers/quickstart-get-started-guide).
- [Microsoft-hosted versus native authentication](https://learn.microsoft.com/en-us/entra/external-id/customers/concept-choose-authentication-approach).
- [Vanilla JavaScript MSAL integration sample](https://learn.microsoft.com/en-us/samples/azure-samples/ms-identity-ciam-javascript-tutorial/ms-identity-ciam-javascript-tutorial-0-sign-in-vanillajs/).
- [Access-token claim validation](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation).
- [Static Web Apps plans](https://learn.microsoft.com/en-us/azure/static-web-apps/plans) and [managed API support](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-overview).
- [External ID Basic pricing](https://www.microsoft.com/en-us/security/pricing/microsoft-entra-external-id).
