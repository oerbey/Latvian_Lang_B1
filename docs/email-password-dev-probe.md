# Email/password Dev authentication test

## Status — 2026-10-11

Replacement-plan Step 1 is deployed at Dev SHA
`7ebbff8fe9e1d242e6043ab94ed8126dba2f27b3`; CI and deployment passed. Health and
anonymous progress rejection passed, and the retired migration endpoint returned 404. Production remains `cbed2cc6f70f245a3673548cc5f2deb57e764950`.

Step 2's customer-identity configuration and local test implementation are
prepared. The test page/API await their Dev PR merge and deployment. **A real
customer token has not yet passed the Free-hosting API acceptance gate.** Do not
replace Word Quest authentication or start Step 3 until that gate passes.

## Azure configuration completed

- Created customer tenant **Latvian Learning Customers**, domain
  `latvianlangb1users.onmicrosoft.com`, country Latvia (directory data in Europe),
  linked to existing Azure subscription 1 / `AZ-myWebApp`.
- Tenant ID: `9e6866a8-fb0e-43ba-b4bb-e993e4a68c20`.
- Dev API **Latvian Progress API Dev**:
  `5f30ff08-511e-4229-93f0-d449346f16c8`; single tenant, v2 access tokens verified
  in the Microsoft Graph app manifest; no client secret created.
- Dev browser app **Latvian Email Password Dev**:
  `2eabc55c-c1c0-43b4-8c4a-36c1d2111c58`; single tenant, SPA callback
  `https://red-ocean-014d1e603-dev.westeurope.4.azurestaticapps.net/auth-probe.html`.
  No client secret created. A real localhost callback remains to be added when
  interactive local development is needed; automated browser tests mock sign-in.
- Owner explicitly approved the Microsoft Platform Policies for both registrations.
- Defined delegated API scope
  `api://5f30ff08-511e-4229-93f0-d449346f16c8/progress.access` (admin consent only).
- Removed the browser app's unused `User.Read` permission. Added only `openid`,
  `offline_access` and the delegated `progress.access` scope. Owner explicitly
  approved admin consent for these three; their granted statuses were verified.
- Created **EmailPasswordDev**, selecting email with password and collecting only
  Email Address. Assigned it only to the Dev browser app. Social sign-in and
  normal email OTP sign-in are not selected.
- Verified Email OTP authentication method is already enabled for All users in
  this customer tenant, satisfying the documented email recovery prerequisite.
  SMS is disabled. No authentication-method policy was changed. Hosted password
  reset still requires the live acceptance check below.
- Saved and verified the following public settings on **Dev only**. Database
  credentials and production settings were not edited.

| Setting                       | Value                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `AUTH_PROBE_ENABLED`          | `true`                                                                                                 |
| `EXTERNAL_AUTH_AUTHORITY`     | `https://latvianlangb1users.ciamlogin.com/`                                                            |
| `EXTERNAL_AUTH_TENANT_ID`     | `9e6866a8-fb0e-43ba-b4bb-e993e4a68c20`                                                                 |
| `EXTERNAL_AUTH_API_AUDIENCE`  | `5f30ff08-511e-4229-93f0-d449346f16c8`                                                                 |
| `EXTERNAL_AUTH_SPA_CLIENT_ID` | `2eabc55c-c1c0-43b4-8c4a-36c1d2111c58`                                                                 |
| `EXTERNAL_AUTH_SCOPE`         | `progress.access`                                                                                      |
| `EXTERNAL_AUTH_ISSUER`        | `https://9e6866a8-fb0e-43ba-b4bb-e993e4a68c20.ciamlogin.com/9e6866a8-fb0e-43ba-b4bb-e993e4a68c20/v2.0` |
| `EXTERNAL_AUTH_JWKS_URI`      | `https://latvianlangb1users.ciamlogin.com/9e6866a8-fb0e-43ba-b4bb-e993e4a68c20/discovery/v2.0/keys`    |

The issuer and signing-key URI above were obtained from the tenant's public
OpenID discovery document rather than inferred from a browser token. Dev retains
`COSMOS_PROGRESS_CONTAINER=progress_dev` and the existing Free hosting resource.
All customer setup occurred in the new tenant created under the project directory;
no RTU configuration was changed.

External ID Basic's first 50,000 monthly active users are free. No paid hosting
upgrade, SMS add-on or enterprise edge was enabled. Existing API/database usage
and Azure limits still apply; the setup does not promise a zero total Azure bill.

## Implemented test

- `/auth-probe.html` is a separate, unlinked Dev acceptance page with Sign in /
  Create account, Check access and Sign out. Microsoft hosts credential entry,
  registration and reset; the app never processes a password.
- `/api/authProbeConfig` returns only the public authority, SPA ID and requested
  API scope. `/api/authProbe` returns only `{ok: true}` after validation. Neither
  endpoint accesses Cosmos or returns identity claims.
- Both endpoints default to disabled and require `AUTH_PROBE_ENABLED=true` plus
  `COSMOS_PROGRESS_CONTAINER=progress_dev`. They remain unavailable on production
  container settings even if the flag is accidentally enabled there.
- JWT validation pins issuer, tenant, API audience and RS256, checks lifetime,
  authorized browser client, delegated scope, user object ID and token version.
  It ignores SWA principal headers and token-provided key URLs. Signing keys are
  cached, refreshed for rotation and fetched with a bounded timeout; errors are
  sanitized. ID tokens with the SPA audience are rejected.
- The owner key is a SHA-256 derivation from verified tenant/user claims, prepared
  for later integration. The probe neither stores nor returns it.
- Existing Microsoft login, progress handlers and SWA progress route gates are
  unchanged. Anonymous probes reach their own validator without opening progress.
- Pinned MSAL Browser 5.25.0 and jose 6.2.12. `build:auth-probe` copies the MSAL
  bundle/license from installed packages; generated assets are ignored by Git.
  The Dev workflow builds them into the staged static app. Production asset
  building must be updated as part of the future production integration/release.
- The quality job installs API dependencies before repository-wide lint so the
  API's dynamic JWT-library import resolves in a clean checkout.
- The test uses full-page redirects and processes callbacks with
  `handleRedirectPromise`; it does not use popup/silent-iframe login. MSAL manages
  session caching and token renewal. No custom token store or token logging.
- Service worker v28 bypasses API/authentication routes and this callback/test
  page. The page sends no referrer, preventing callback codes from leaking into
  subsequent request referrers. Tokens never appear in the displayed status.

## Verification completed locally

- Root tests: 153 passed, including authentication cache-bypass regression.
- API tests: 13 passed; real synthetic RSA signatures test issuer/audience,
  expiry/not-before, user/version claims, delegated scope/client, production
  guards, forged SWA headers, public config and controlled trust/key failures.
- Full Playwright: 27 passed. Probe tests mock only the identity service,
  verify the bearer goes only to the probe, reject malformed success replies and
  inspect desktop/phone layouts with no unhandled page errors.
- Lint, typecheck, formatting and data/i18n validation passed.
- Package audits reported no vulnerability entry for the new MSAL/jose packages;
  existing dependency findings were not changed by this task.

These tests do not establish that Azure Free forwards a real provider access
token to the managed Function. That requires deployment and the next checks.

## Live acceptance after Dev merge

1. Confirm the Dev deployment and its quality/API/browser jobs succeed. Verify
   health, existing anonymous progress rejection, probe 401 without a token and
   availability of the public config only on Dev.
2. Open the test page in the owner's usual browser. Create an email/password
   customer account, verify email, complete sign-in and click Check access.
   Expect **Access verified. No game progress was read or changed.**
3. Refresh and recheck access. Sign out and verify Check access is disabled.
4. Sign in again and exercise Forgot password with email verification; the owner
   privately enters the new password and checks sign-in/access afterward. Never
   send passwords, email codes or access tokens to chat, logs or source control.
5. Verify API rejection for expired/wrong-resource tokens using test fixtures;
   keep production and existing game progress unchanged throughout the probe.
6. Record the deployment SHA/URL and actual outcomes. Only a successful real
   sign-in/token/API test closes the Free-hosting feasibility gate. Resolve any
   failure before Step 3; it does not authorize an upgrade to Standard.

If the owner's admin email is reused for customer signup, External ID can create
a separate customer account with the same email. No account linking or migration
is attempted. Use the new email/password account for these checks.

## Recovery

Set `AUTH_PROBE_ENABLED=false` on Dev to disable both test endpoints. Existing
Microsoft Word Quest sync does not depend on any `EXTERNAL_AUTH_*` setting. The
pre-probe Dev recovery SHA is `7ebbff8fe9e1d242e6043ab94ed8126dba2f27b3`.
Do not delete tenant/accounts/records as a recovery step. Remove the temporary
probe after the feasibility gate when integrating the approved authentication flow.

## Primary references

- [External ID Basic pricing](https://www.microsoft.com/en-us/security/pricing/microsoft-entra-external-id).
- [Create a customer tenant](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-create-external-tenant-portal).
- [Configure customer password reset](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-enable-password-reset-customers).
- [MSAL redirect handling](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/redirect-bridge.md).
- [API token claim validation](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation).
