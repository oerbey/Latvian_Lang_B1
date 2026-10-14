import { authProbeErrorSummary } from './lib/auth-probe-errors.js';

const status = document.getElementById('probe-status');
const login = document.getElementById('probe-login');
const check = document.getElementById('probe-check');
const logout = document.getElementById('probe-logout');
let initializationStage = 'configuration';

async function initialize() {
  const response = await fetch('/api/authProbeConfig', { cache: 'no-store' });
  if (!response.ok) throw new Error('Not configured');
  const config = await response.json();
  const redirectUri = new URL('auth-probe.html', location.href).href.split('?')[0].split('#')[0];
  initializationStage = 'startup';
  const client = new window.msal.PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      knownAuthorities: config.knownAuthorities,
      redirectUri,
    },
    cache: { cacheLocation: 'sessionStorage' },
  });
  await client.initialize();
  let result;
  let callbackError;
  try {
    result = await client.handleRedirectPromise();
  } catch (error) {
    callbackError = error;
  }
  // A failed callback must not appear successful because an older account was cached.
  const account = callbackError ? null : result?.account || client.getAllAccounts()[0];
  if (account) client.setActiveAccount(account);
  login.disabled = false;
  check.disabled = !account;
  logout.disabled = !account;
  status.textContent = callbackError
    ? `Sign-in could not complete${authProbeErrorSummary(callbackError)}. Try sign-in again.`
    : account
      ? 'Signed in. Check access to complete the test.'
      : 'Ready to sign in or create an email/password account.';
  login.addEventListener('click', () => {
    client.loginRedirect({ scopes: [config.scope] }).catch((error) => {
      status.textContent = `Sign-in could not start${authProbeErrorSummary(error)}. Please try again.`;
    });
  });
  logout.addEventListener('click', () => {
    client.logoutRedirect({ postLogoutRedirectUri: redirectUri }).catch(() => {
      status.textContent = 'Sign-out could not complete. Please try again.';
    });
  });
  check.addEventListener('click', async () => {
    check.disabled = true;
    try {
      const token = await client.acquireTokenSilent({
        scopes: [config.scope],
        account: client.getActiveAccount(),
        // This callback uses full-page redirect handling, so renewal must not start a v5 iframe bridge.
        cacheLookupPolicy: window.msal.CacheLookupPolicy.AccessTokenAndRefreshToken,
      });
      const probe = await fetch('/api/authProbe', {
        headers: { Authorization: `Bearer ${token.accessToken}` },
        cache: 'no-store',
      });
      const result = await probe.json().catch(() => null);
      status.textContent =
        probe.ok && result?.ok === true
          ? 'Access verified. No game progress was read or changed.'
          : 'Access was rejected. The authentication test has not passed.';
    } catch (error) {
      if (error instanceof window.msal.InteractionRequiredAuthError) {
        try {
          await client.acquireTokenRedirect({ scopes: [config.scope] });
        } catch {
          status.textContent = 'Sign-in could not start. Please try again.';
        }
      } else {
        status.textContent = 'Access could not be checked. Please try again.';
      }
    } finally {
      check.disabled = false;
    }
  });
}

initialize().catch((error) => {
  status.textContent =
    initializationStage === 'configuration'
      ? 'This sign-in test is not enabled or configured here.'
      : `Sign-in could not initialize${authProbeErrorSummary(error)}. Please refresh and try again.`;
});
