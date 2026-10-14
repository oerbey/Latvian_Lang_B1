/** MSAL owns credentials/token caching; this module holds only the verified owner for this page. */
export function createEmailAuth({
  fetchImpl = (...args) => fetch(...args),
  sdk = () => window.msal,
  location = () => window.location,
} = {}) {
  let initialization;
  let client;
  let config;
  let session;
  let generation = 0;
  let locallySignedOut = false;

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
        client = new (sdk().PublicClientApplication)({
          auth: {
            clientId: config.clientId,
            authority: config.authority,
            knownAuthorities: config.knownAuthorities,
            redirectUri,
          },
          cache: { cacheLocation: 'sessionStorage' },
        });
        await client.initialize();
        const result = await client.handleRedirectPromise({ navigateToLoginRequestUrl: false });
        const accounts = client.getAllAccounts();
        const account =
          result?.account ||
          client.getActiveAccount() ||
          (accounts.length === 1 ? accounts[0] : null);
        if (account) client.setActiveAccount(account);
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
      sdk()?.InteractionRequiredAuthError && error instanceof sdk().InteractionRequiredAuthError,
    );
  }

  async function tokenFor(account, epoch) {
    if (!account) throw new Error('Sign-in required');
    const result = await client.acquireTokenSilent({
      scopes: [config.scope],
      account,
      // Full-page callbacks do not implement MSAL's popup/iframe bridge.
      cacheLookupPolicy: sdk().CacheLookupPolicy.AccessTokenAndRefreshToken,
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
      if (locallySignedOut) return { status: 'anonymous', user: null };
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
    locallySignedOut = false;
    generation++;
    session = null;
    await client.loginRedirect({ scopes: [config.scope], prompt: 'login' });
  }

  async function signOut() {
    locallySignedOut = true;
    generation++;
    session = null;
    if (!client) return;
    try {
      // Clear all app accounts so refresh cannot silently select a different cached learner.
      await client.logoutRedirect({
        postLogoutRedirectUri: new URL('/auth-probe.html', location().origin).href,
      });
    } catch (error) {
      await client.clearCache();
      throw error;
    }
  }

  return { initialize, getCurrentUser, getAccessToken, signIn, signOut, isInteractionRequired };
}

const auth = createEmailAuth();
export const initializeAuth = auth.initialize;
export const getCurrentUser = auth.getCurrentUser;
export const getAccessToken = auth.getAccessToken;
export const signIn = auth.signIn;
export const signOut = auth.signOut;
export const isInteractionRequired = auth.isInteractionRequired;
