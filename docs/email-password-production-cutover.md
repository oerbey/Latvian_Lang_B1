# Email/password production cutover

## Status — 2026-10-14

Accepted Dev: `c8060870772747670b47f0e364fc057887b78af0`. Automated checks and
owner registration/login/reset/save/refresh/second-browser/logout/guest/isolation
checks pass. Owner-reported External ID schema-2 Word Quest record counts are
1 in `progress_dev`, 0 in `progress_prod`.

Production remains the Microsoft-only recovery build
`cbed2cc6f70f245a3673548cc5f2deb57e764950`. Production registrations, permissions,
flow assignment and public settings are configured and verified in Azure.
The application release, approval and live production acceptance remain pending.
This guide and the prepared
workflow do not constitute a production deployment.

### Verified production setup

| Item                      | Verified value                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------- |
| API app                   | Latvian Progress API Production — `c5d82e66-0e90-46ac-a3b6-dd6d4d7614da`           |
| SPA app                   | Latvian Email Password Production — `c06ad00d-a006-4bdb-8ea2-c1e85d5454c2`         |
| API scope                 | `api://c5d82e66-0e90-46ac-a3b6-dd6d4d7614da/progress.access`, enabled, Admins only |
| Access token version      | API manifest `requestedAccessTokenVersion: 2`                                      |
| Flow                      | EmailPasswordProduction, email with password, Email Address only                   |
| Flow application          | Only the production SPA above                                                      |
| Logout claim              | SPA optional ID-token `login_hint`                                                 |
| Consented SPA permissions | `openid`, `offline_access`, production API delegated `progress.access`             |
| Storage                   | Production `COSMOS_PROGRESS_CONTAINER=progress_prod`                               |
| Hosting                   | Existing Latvian SWA, Free                                                         |

The owner explicitly authorized production Platform Policies acceptance and
these three consented permissions. The SPA's default ungranted Graph User.Read
was removed before consent. No client secret was created. Existing tenant email
recovery remains the accepted Dev baseline; actual production reset is still an
acceptance check. Setup used Latvian Learning Customers for registrations and
Default Directory for hosting. No RTU directory was selected.

## 1. Configure separate production applications

Use **Latvian Learning Customers**, tenant
`9e6866a8-fb0e-43ba-b4bb-e993e4a68c20`, domain
`latvianlangb1users.onmicrosoft.com`. Never use the RTU directory. Keep existing
Free hosting and Basic customer identity features; no secrets, paid add-ons or
new hosting resource are required.

- Register **Latvian Progress API Production**, single tenant. Set v2 access
  tokens, expose `api://c5d82e66-0e90-46ac-a3b6-dd6d4d7614da/progress.access` as an enabled
  delegated scope with administrator consent. Record its public client ID.
- Register **Latvian Email Password Production**, single tenant public SPA.
  Register the exact SPA callback
  `https://red-ocean-014d1e603.4.azurestaticapps.net/auth-probe.html`, also used as
  the post-logout return URI. Do not add Dev or wildcard callbacks to this app.
- Add optional **ID-token** claim `login_hint` to the production SPA so logout
  can identify the current provider session without an account picker.
- Grant the SPA only `openid`, `offline_access` and the production API's delegated
  `progress.access` permission. Remove unused Graph permissions from the SPA.
  Admin consent and any mandatory Platform Policies acceptance must have owner
  authorization for these production apps; earlier Dev-specific approvals are
  recorded separately.
- Create **EmailPasswordProduction** signup/signin flow using email/password,
  email verification and email address collection. Assign only the production
  SPA. Keep email-based password recovery available and SMS disabled.
- Record both public app IDs, flow assignment, permissions and claim setup.
  No password, code, raw token or customer identity belongs in source control.

## 2. Configure the existing production environment

Use SWA **Latvian**, resource group **AZ-myWebApp**, existing subscription
`10aa66d9-0316-488d-b11c-8e2362fd79bf`. Select its **production** environment.
Keep existing Cosmos credentials/database and `COSMOS_PROGRESS_CONTAINER=progress_prod`.
Preserve the Microsoft-only recovery settings until the release is accepted.

Set these public authentication settings only after the production apps exist:

| Setting                       | Value                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `EXTERNAL_AUTH_AUTHORITY`     | `https://latvianlangb1users.ciamlogin.com/`                                                            |
| `EXTERNAL_AUTH_TENANT_ID`     | `9e6866a8-fb0e-43ba-b4bb-e993e4a68c20`                                                                 |
| `EXTERNAL_AUTH_API_AUDIENCE`  | `c5d82e66-0e90-46ac-a3b6-dd6d4d7614da`                                                                 |
| `EXTERNAL_AUTH_SPA_CLIENT_ID` | `c06ad00d-a006-4bdb-8ea2-c1e85d5454c2`                                                                 |
| `EXTERNAL_AUTH_SCOPE`         | `progress.access`                                                                                      |
| `EXTERNAL_AUTH_ISSUER`        | `https://9e6866a8-fb0e-43ba-b4bb-e993e4a68c20.ciamlogin.com/9e6866a8-fb0e-43ba-b4bb-e993e4a68c20/v2.0` |
| `EXTERNAL_AUTH_JWKS_URI`      | `https://latvianlangb1users.ciamlogin.com/9e6866a8-fb0e-43ba-b4bb-e993e4a68c20/discovery/v2.0/keys`    |

Verify issuer/JWKS through the trusted tenant's discovery document before saving.
Do not enable probe/migration settings or replace existing deployment secrets.
Adding these settings does not replace the old application's handlers; the code
cutover occurs at the approved release.

## 3. Release the reviewed implementation

The production preparation PR targets `main` and includes accepted Dev code plus
main's existing production workflow and reusable exact-SHA CI support. Merge
only after review and green CI. Merging does not automatically deploy production.

Dispatch **Azure Static Web Apps production release** from `main`, selecting the
reviewed full main commit SHA. The workflow checks main ancestry and the
authenticated baseline, runs CI on that exact commit, then waits for the existing
`production` environment approval. Deployment checks out the same SHA.

Staging archives tracked files, removes source API/workflow directories from the
static artifact, and builds the pinned public MSAL SDK/license into it. The API
deploys from `api`. Older Microsoft-only recovery commits without the auth build
script skip SDK staging. Do not dispatch an email/password build before its
production configuration is ready.

## 4. Production acceptance

- Verify deployment/CI SHA, public authConfig with the production app IDs, health,
  anonymous session/read/write rejection and retired probe/migration routes.
- Owner registers/signs in with an email/password account. Existing Microsoft
  accounts/progress are not imported. Complete a node, wait for Saved to cloud,
  then check refresh and same-account restore in another browser.
- Verify direct logout, guest separation after refresh, password reset, renewed
  sign-in and two-account isolation. Keep credentials/tokens private.
- Confirm `progress_prod` contains the new production writes using metadata/counts.
  Record the Dev count before this check and confirm it remains unchanged.
- Confirm production and Dev use distinct SPA/API IDs. Their tokens must not
  authorize the other environment; exact audience/client validation remains on.
- Record deployed SHA, public settings, counts, owner acceptance and Free/Basic
  configuration. Retain the existing deployment approval gate.

## Recovery

Redeploy `cbed2cc6f70f245a3673548cc5f2deb57e764950` through the manual main release
workflow, with its matching Microsoft-only route/authentication settings and
`progress_prod`. New External ID records remain intact but are not accessible
through the Microsoft-only owner scheme. The owner permits fresh accounts and
does not require migration. Never weaken JWT or principal checks to recover.

References: [MSAL logout](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/logout),
[customer user flows](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-flow-sign-up-sign-in-customers).
