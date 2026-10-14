# Word Quest email/password integration

## Deployment boundary

Prepared from accepted Dev `ec247afba815119cdfd5cf01b390ceafbd510aca`, after the
owner confirmed real registration/login/API access/refresh/logout/password reset
on Free hosting. This implementation awaits owner-controlled merge to `dev` and
live game acceptance. Production remains the Microsoft-only recovery build
`cbed2cc6f70f245a3673548cc5f2deb57e764950`; no production deployment/configuration
or database mutations are part of this change.

## Application flow

- Sign in / Create account launches the hosted email/password flow with the
  existing Dev SPA/API registrations and delegated scope. Credentials remain
  inside Microsoft's hosted pages.
- The exact registered `/auth-probe.html` path now completes MSAL's redirect and
  returns to `/word-quest.html`. MSAL v5 receives
  `handleRedirectPromise({navigateToLoginRequestUrl: false})`; callback errors
  display only safe codes and a return link. There is no automatic progress write
  as part of the callback.
- `/api/authConfig` exposes only authority, trusted hostnames, SPA ID, API scope
  and the fixed callback path. `/api/authSession` validates the access token and
  returns only the hashed owner key used for local namespaces. Both use no-store.
- Tokens use `X-Latvian-Authorization`, never URLs, logs, game storage or the
  platform-reserved Authorization header. MSAL owns sessionStorage token caching
  and silent renewal; interaction-required failures ask for explicit sign-in.
  A write is not replayed automatically after expired/forbidden authentication.
- Both progress handlers validate tokens before accessing Cosmos. The former SWA
  authenticated route gates and principal parser are removed together; old SWA
  cookies/principal headers alone grant no application access. API errors remain
  generic and responses use no-store.
- The temporary auth probe APIs are removed. `AUTH_PROBE_ENABLED` is unused;
  existing EXTERNAL*AUTH*\* Dev settings remain unchanged. No Azure callback,
  permission, resource or plan changes are needed for the Dev integration.

## Ownership and local state

The server derives `extid:` + SHA-256(verified tid + NUL + verified oid) and writes
`${ownerKey}:word-quest` in the existing `/userId` partition. Stored metadata uses
`identityProvider: external-id` and `ownershipSchemaVersion: 2`. Request-supplied
owner/provider/schema metadata never chooses a partition.

Guest state uses `llb1:word-quest:v2:guest`; authenticated state uses
`llb1:word-quest:v2:${ownerKey}` with a corresponding `:sync` key. Old unscoped
keys are ignored. Signing in starts a fresh account or restores that account's
cloud copy; guest progress is not imported. Missing cloud records are not written
until there is account progress to save. Existing Cosmos records remain intact.

Sign-out clears all SDK accounts/tokens for this app, cancels debounce/retry work,
aborts requests, closes conflict choices and
returns to guest state. Owner transitions also clear the active battle/world, and
late challenge loads or result timers cannot revive the old gameplay context.
A same-owner connection retry can continue gameplay unless the player chooses a
different cloud snapshot. Every load/save/choice checks the captured session
sequence before applying a response. Tokens are bound to the captured SDK account
and verified owner, so a pending snapshot cannot be retargeted to a new account.
Pending snapshots persist until acknowledgement. A revision conflict requires
an explicit local/cloud choice before a replacement write.

Guest play works offline after assets are cached, including refresh and visited
battle data. If authentication/configuration cannot be verified on a reload,
the page opens the separate guest namespace; account-local snapshots remain
stored and become available when that account can be verified again. An existing
signed-in page can continue locally through an outage; cloud writes resume only
after its session/cloud revision have been checked.

## Dev acceptance after merge

1. Verify deployment/CI and health, anonymous progress/session rejection and
   public configuration. Confirm removed probe endpoints return 404.
2. Open Dev Word Quest in a usual browser; sign in using the accepted test
   email/password account. A new account shows a fresh account message.
3. Complete a node, wait for Saved to cloud, refresh and confirm the same XP.
   Sign in in another browser and verify cloud restore.
4. Sign out and confirm the guest namespace. Sign in to a second temporary
   email/password account, verify fresh/independent progress and then switch back.
   If a second email is unavailable, document that limit before release.
5. Verify logout/password reset/session renewal, desktop/mobile status and guest
   offline behavior. Keep passwords/codes/tokens/header values private.
6. Confirm Dev storage is still `progress_dev`. No production release until
   available live game acceptance and the release decision are recorded.

## Recovery and production preparation

Dev recovery is the accepted probe/Microsoft game build above with its matching
route gates and settings. New account records need not be visible through it.
Never recover by weakening JWT checks.

Production requires separate SPA/API registrations/settings, the exact production
callback path, `progress_prod`, and the production workflow's authentication-bundle
staging before its approved release. The Dev workflow now runs
`node scripts/build-auth-client.mjs .swa-static`; local startup/E2E uses
`npm run build:auth-client`. No production workflow is present on this Dev branch;
review the workflow on `main` as part of production preparation.
