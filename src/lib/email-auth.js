import { loadAuthSdk } from './auth-sdk.js';
import { rememberAuthReturn } from './auth-return.js';

/** MSAL owns the shared browser cache; application events carry no credentials or owner claims. */
export function createEmailAuth({
  fetchImpl = (...args) => fetch(...args),
  sdk = loadAuthSdk,
  location = () => window.location,
  returnStorage = () => window.sessionStorage,
  channel = () => (window.BroadcastChannel ? new window.BroadcastChannel('llb1:auth') : null),
} = {}) {
  let initialization;
  let client;
  let config;
  let session;
  let generation = 0;
  let locallySignedOut = false;
  let msal;
  let knownAccountId = null;
  const listeners = new Set();
  let crossTab;
  let callbackId;

  function invalidate(reason) {
    generation++;
    session = null;
    for (const listener of listeners) {
      try {
        listener({ reason });
      } catch {
        // A view failure must never prevent logout or other views from invalidating.
      }
    }
  }

  function refreshClient(reason) {
    client.removeEventCallback?.(callbackId);
    client = null;
    initialization = null;
    invalidate(reason);
  }

  function accountChanged(eventType) {
    if (!client) return;
    const accountId = client.getActiveAccount()?.homeAccountId || null;
    if (accountId === knownAccountId) {
      if (accountId && eventType === msal.EventType?.LOGIN_SUCCESS) {
        locallySignedOut = false;
        refreshClient('refresh');
      }
      return;
    }
    knownAccountId = accountId;
    locallySignedOut = !accountId;
    // MSAL imports cross-tab encrypted entries asynchronously. A fresh initialized
    // instance reads the complete cache before token lookup can prune missing entries.
    if (accountId) refreshClient('account-changed');
    else invalidate('signed-out');
  }

  function connectEvents() {
    knownAccountId = client.getActiveAccount()?.homeAccountId || null;
    const eventTypes = msal.EventType || {};
    callbackId = client.addEventCallback?.((event) => {
      if (
        [
          eventTypes.LOGIN_SUCCESS,
          eventTypes.LOGOUT_SUCCESS,
          eventTypes.ACTIVE_ACCOUNT_CHANGED,
        ].includes(event.eventType)
      )
        accountChanged(event.eventType);
    });
    try {
      crossTab?.close?.();
      crossTab = channel();
      crossTab?.addEventListener('message', ({ data }) => {
        if (data === 'signed-out') {
          locallySignedOut = true;
          invalidate('signed-out');
        } else if (data === 'signed-in') {
          const epoch = generation;
          void initialization
            ?.then((initialized) => {
              if (generation !== epoch || client !== initialized) return;
              locallySignedOut = false;
              refreshClient('account-changed');
            })
            .catch(() => {});
        }
      });
    } catch {
      // SDK events and focus reconciliation remain available if messaging is blocked.
    }
  }

  async function initialize() {
    if (!initialization) {
      initialization = (async () => {
        const response = await fetchImpl('/api/authConfig', { cache: 'no-store' });
        if (!response.ok) throw new Error('Authentication unavailable');
        config = await response.json();
        const redirectUri = new URL(config.redirectPath, location().origin).href;
        if (
          new URL(redirectUri).origin !== location().origin ||
          config.redirectPath !== '/auth-probe.html'
        ) {
          throw new Error('Invalid callback');
        }
        msal = await sdk();
        const initializingClient = new msal.PublicClientApplication({
          auth: {
            clientId: config.clientId,
            authority: config.authority,
            knownAuthorities: config.knownAuthorities,
            redirectUri,
          },
          cache: { cacheLocation: 'localStorage' },
        });
        // Two first-open tabs must not generate competing SDK cache-encryption cookies.
        if (globalThis.navigator?.locks) {
          await navigator.locks.request('llb1:auth-cache', () => initializingClient.initialize());
        } else await initializingClient.initialize();
        const result = await initializingClient.handleRedirectPromise({
          navigateToLoginRequestUrl: false,
        });
        const accounts = initializingClient.getAllAccounts();
        const account =
          result?.account ||
          initializingClient.getActiveAccount() ||
          (accounts.length === 1 ? accounts[0] : null);
        if (
          account &&
          initializingClient.getActiveAccount()?.homeAccountId !== account.homeAccountId
        )
          initializingClient.setActiveAccount(account);
        // Focus and page restoration may reconcile while the SDK cache is still opening.
        client = initializingClient;
        connectEvents();
        if (result?.account) {
          // Other tabs can receive MSAL events before the redirect cache is complete.
          try {
            crossTab?.postMessage('signed-in');
          } catch {
            // SDK events and focus reconciliation still apply.
          }
        }
        return client;
      })().catch((error) => {
        initialization = null;
        throw error;
      });
    }
    return initialization;
  }

  function isInteractionRequired(error) {
    if (!client) return false;
    return Boolean(
      msal?.InteractionRequiredAuthError && error instanceof msal.InteractionRequiredAuthError,
    );
  }

  async function tokenFor(account, epoch) {
    if (!account) throw new Error('Sign-in required');
    const result = await client.acquireTokenSilent({
      scopes: [config.scope],
      account,
      // Full-page callbacks do not implement MSAL's popup/iframe bridge.
      cacheLookupPolicy: msal.CacheLookupPolicy.AccessTokenAndRefreshToken,
    });
    if (
      epoch !== generation ||
      client.getActiveAccount()?.homeAccountId !== account.homeAccountId
    ) {
      throw new Error('Account changed');
    }
    return result.accessToken;
  }

  function currentSessionUser() {
    return session && client.getActiveAccount()?.homeAccountId === session.account.homeAccountId
      ? session.user
      : null;
  }

  async function getCurrentUser() {
    const epoch = generation;
    try {
      await initialize();
      if (locallySignedOut || epoch !== generation) return { status: 'anonymous', user: null };
      const account = client.getActiveAccount();
      if (!account) {
        session = null;
        return { status: 'anonymous', user: null };
      }
      const token = await tokenFor(account, epoch);
      const response = await fetchImpl('/api/authSession', {
        cache: 'no-store',
        headers: { 'X-Latvian-Authorization': `Bearer ${token}` },
      });
      if (
        epoch !== generation ||
        client.getActiveAccount()?.homeAccountId !== account.homeAccountId
      )
        return { status: 'anonymous', user: null };
      if (!response.ok)
        return {
          status: response.status === 401 ? 'reauth' : 'unavailable',
          user: currentSessionUser(),
        };
      const payload = await response.json();
      if (
        epoch !== generation ||
        client.getActiveAccount()?.homeAccountId !== account.homeAccountId
      )
        return { status: 'anonymous', user: null };
      if (!/^extid:[a-f0-9]{64}$/.test(payload?.userId || '')) throw new Error('Invalid session');
      const user = { userId: payload.userId };
      session = { account, user };
      return { status: 'authenticated', user };
    } catch (error) {
      if (epoch !== generation) return { status: 'anonymous', user: null };
      return {
        status: isInteractionRequired(error) ? 'reauth' : 'unavailable',
        user: currentSessionUser(),
      };
    }
  }

  async function getAccessToken(ownerKey) {
    if (!session || session.user.userId !== ownerKey) throw new Error('Sign-in required');
    return tokenFor(session.account, generation);
  }

  async function signIn() {
    await initialize();
    rememberAuthReturn(location().pathname, returnStorage());
    locallySignedOut = false;
    invalidate('signing-in');
    try {
      await client.loginRedirect({ scopes: [config.scope], prompt: 'login' });
    } catch (error) {
      invalidate('refresh');
      throw error;
    }
  }

  async function signOut() {
    const account = client?.getActiveAccount();
    const hint = account?.loginHint || account?.idTokenClaims?.login_hint;
    const logoutHint = typeof hint === 'string' && hint ? hint : undefined;
    locallySignedOut = true;
    invalidate('signed-out');
    try {
      crossTab?.postMessage('signed-out');
    } catch {
      // The SDK still propagates cache/account removal to other tabs.
    }
    if (!client) return;
    try {
      rememberAuthReturn(location().pathname, returnStorage());
      // Clear all app accounts so refresh cannot silently select a different cached learner.
      await client.logoutRedirect({
        logoutHint,
        postLogoutRedirectUri: new URL('/auth-probe.html', location().origin).href,
      });
    } catch (error) {
      await client.clearCache();
      throw error;
    }
  }

  /** Subscribers invalidate account views synchronously, then reverify identity for a new account. */
  function onAuthChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    initialize,
    getCurrentUser,
    getAccessToken,
    signIn,
    signOut,
    isInteractionRequired,
    onAuthChange,
    reconcileAccount: () => {
      if (client) accountChanged();
    },
  };
}

const auth = createEmailAuth();
export const initializeAuth = auth.initialize;
export const getCurrentUser = auth.getCurrentUser;
export const getAccessToken = auth.getAccessToken;
export const signIn = auth.signIn;
export const signOut = auth.signOut;
export const isInteractionRequired = auth.isInteractionRequired;
export const onAuthChange = auth.onAuthChange;
export const reconcileAccount = auth.reconcileAccount;
