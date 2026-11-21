import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmailAuth } from '../../src/lib/email-auth.js';
const owner = `extid:${'a'.repeat(64)}`;
function fixture(overrides = {}, initializeClient = async () => {}) {
  let client;
  class Expired extends Error {}
  const sdk = {
    EventType: {
      LOGIN_SUCCESS: 'login',
      LOGOUT_SUCCESS: 'logout',
      ACTIVE_ACCOUNT_CHANGED: 'account',
    },
    InteractionRequiredAuthError: Expired,
    CacheLookupPolicy: { AccessTokenAndRefreshToken: 2 },
    PublicClientApplication: class {
      constructor(config) {
        client = this;
        this.config = config;
        this.account = { homeAccountId: 'synthetic-A' };
      }
      async initialize() {
        await initializeClient(this);
      }
      async handleRedirectPromise(options) {
        assert.equal(options.navigateToLoginRequestUrl, false);
        return null;
      }
      getAllAccounts() {
        return [this.account];
      }
      getActiveAccount() {
        return this.account;
      }
      setActiveAccount(account) {
        this.account = account;
      }
      addEventCallback(callback) {
        this.eventCallback = callback;
      }
      async acquireTokenSilent(request) {
        this.request = request;
        if (this.fail) throw new Expired();
        return { accessToken: 'synthetic-token' };
      }
      async loginRedirect() {}
      async logoutRedirect() {
        this.account = null;
      }
    },
  };
  const requests = [];
  const auth = createEmailAuth({
    sdk: () => sdk,
    location: () => ({ origin: 'https://example.test' }),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return new Response(
        JSON.stringify(
          url.endsWith('Config')
            ? {
                redirectPath: '/auth-probe.html',
                authority: 'https://test.ciamlogin.com/',
                clientId: 'app',
                scope: 'api://api/progress.access',
                knownAuthorities: ['test.ciamlogin.com'],
              }
            : { userId: owner },
        ),
      );
    },
    ...overrides,
  });
  return { auth, requests, getClient: () => client };
}

test('verified server owner binds tokens to one SDK account without browser token storage', async () => {
  const { auth, getClient, requests } = fixture();
  assert.deepEqual(await auth.getCurrentUser(), {
    status: 'authenticated',
    user: { userId: owner },
  });
  assert.equal(requests[1].options.headers['X-Latvian-Authorization'], 'Bearer synthetic-token');
  assert.equal(getClient().request.cacheLookupPolicy, 2);
  assert.equal(getClient().config.cache.cacheLocation, 'localStorage');
  assert.equal(await auth.getAccessToken(owner), 'synthetic-token');
  await assert.rejects(auth.getAccessToken(`extid:${'b'.repeat(64)}`));
  getClient().fail = true;
  await assert.rejects(auth.getAccessToken(owner));
  assert.equal((await auth.getCurrentUser()).status, 'reauth');
});

test('focus reconciliation waits for the SDK cache to initialize', async () => {
  let start;
  let finish;
  const started = new Promise((resolve) => (start = resolve));
  const openingCache = new Promise((resolve) => (finish = resolve));
  const { auth } = fixture({}, async (client) => {
    const getActiveAccount = client.getActiveAccount.bind(client);
    client.getActiveAccount = () => {
      throw new Error('SDK cache is not initialized');
    };
    start();
    await openingCache;
    client.getActiveAccount = getActiveAccount;
  });
  const pending = auth.getCurrentUser();
  await started;
  try {
    assert.doesNotThrow(() => auth.reconcileAccount());
  } finally {
    finish();
  }
  assert.deepEqual(await pending, { status: 'authenticated', user: { userId: owner } });
});

test('logout invalidates a pending token before it can be sent under a changed session', async () => {
  const { auth, getClient } = fixture();
  await auth.getCurrentUser();
  let resolve;
  getClient().acquireTokenSilent = () =>
    new Promise((done) => {
      resolve = done;
    });
  const pending = auth.getAccessToken(owner);
  await auth.signOut();
  resolve({ accessToken: 'old-token' });
  await assert.rejects(pending, /Account changed/);
  assert.equal((await auth.getCurrentUser()).status, 'anonymous');
  await assert.rejects(auth.getAccessToken(owner));
});

test('configuration failure leaves guest play available and never starts workforce authentication', async () => {
  let calls = 0;
  const auth = createEmailAuth({
    fetchImpl: async () => {
      calls++;
      return new Response('{}', { status: 503 });
    },
    sdk: () => assert.fail('no SDK fallback'),
  });
  assert.equal((await auth.getCurrentUser()).status, 'unavailable');
  assert.equal((await auth.getCurrentUser()).status, 'unavailable');
  assert.equal(calls, 2);
});

test('a changed SDK account invalidates pending token acquisition even without logout', async () => {
  const { auth, getClient } = fixture();
  await auth.getCurrentUser();
  let resolve;
  getClient().acquireTokenSilent = () =>
    new Promise((done) => {
      resolve = done;
    });
  const pending = auth.getAccessToken(owner);
  getClient().account = { homeAccountId: 'synthetic-B' };
  resolve({ accessToken: 'other-account-token' });
  await assert.rejects(pending, /Account changed/);
});

test('provider logout failure still clears the local session and SDK cache', async () => {
  const { auth, getClient } = fixture();
  await auth.getCurrentUser();
  getClient().logoutRedirect = async () => {
    throw new Error('Provider unavailable');
  };
  let cleared = false;
  getClient().clearCache = async () => {
    cleared = true;
    getClient().account = null;
  };
  await assert.rejects(auth.signOut(), /Provider unavailable/);
  assert.equal(cleared, true);
  assert.equal((await auth.getCurrentUser()).status, 'anonymous');
  await assert.rejects(auth.getAccessToken(owner));
});

test('logout clears every app account so a refresh cannot silently select another learner', async () => {
  let accounts = [{ homeAccountId: 'cached-A' }, { homeAccountId: 'cached-B' }];
  class Client {
    async initialize() {}
    async handleRedirectPromise() {
      return null;
    }
    getAllAccounts() {
      return accounts;
    }
    getActiveAccount() {
      return accounts[0] || null;
    }
    setActiveAccount() {}
    async acquireTokenSilent() {
      return { accessToken: 'synthetic-token' };
    }
    async logoutRedirect(options) {
      accounts = options.account ? accounts.filter((account) => account !== options.account) : [];
    }
  }
  const options = {
    sdk: () => ({
      PublicClientApplication: Client,
      CacheLookupPolicy: { AccessTokenAndRefreshToken: 2 },
    }),
    location: () => ({ origin: 'https://example.test' }),
    fetchImpl: async (url) =>
      new Response(
        JSON.stringify(
          url.endsWith('Config')
            ? {
                redirectPath: '/auth-probe.html',
                authority: 'https://test.ciamlogin.com/',
                clientId: 'app',
                scope: 'progress.access',
              }
            : { userId: owner },
        ),
      ),
  };
  const auth = createEmailAuth(options);
  assert.equal((await auth.getCurrentUser()).status, 'authenticated');
  await auth.signOut();
  assert.equal(accounts.length, 0);
  assert.equal((await createEmailAuth(options).getCurrentUser()).status, 'anonymous');
});

test('logout identifies the active provider session while clearing all app accounts', async () => {
  for (const hintSource of ['loginHint', 'idTokenClaims']) {
    const { auth, getClient } = fixture();
    await auth.getCurrentUser();
    const client = getClient();
    if (hintSource === 'loginHint') client.account.loginHint = 'synthetic-opaque-hint';
    else client.account.idTokenClaims = { login_hint: 'synthetic-opaque-hint' };
    client.logoutRedirect = async (options) => {
      assert.equal(options.logoutHint, 'synthetic-opaque-hint');
      assert.equal(options.account, undefined);
      assert.equal(options.postLogoutRedirectUri, 'https://example.test/auth-probe.html');
      client.account = null;
    };
    await auth.signOut();
    assert.equal((await auth.getCurrentUser()).status, 'anonymous');
  }
});

test('logout never substitutes an email address or a malformed claim for the provider hint', async () => {
  const { auth, getClient } = fixture();
  await auth.getCurrentUser();
  const client = getClient();
  client.account.username = 'synthetic@example.test';
  client.account.idTokenClaims = { login_hint: ['malformed-hint'] };
  client.logoutRedirect = async (options) => {
    assert.equal(options.logoutHint, undefined);
    client.account = null;
  };
  await auth.signOut();
});

test('SDK account changes synchronously invalidate subscribers and outstanding owner tokens', async () => {
  const { auth, getClient } = fixture();
  await auth.getCurrentUser();
  const reasons = [];
  auth.onAuthChange(({ reason }) => reasons.push(reason));
  let resolve;
  getClient().acquireTokenSilent = () =>
    new Promise((done) => {
      resolve = done;
    });
  const pending = auth.getAccessToken(owner);
  getClient().account = { homeAccountId: 'synthetic-B' };
  getClient().eventCallback({ eventType: 'account' });
  assert.deepEqual(reasons, ['account-changed']);
  resolve({ accessToken: 'old-token' });
  await assert.rejects(pending, /Account changed/);
  await assert.rejects(auth.getAccessToken(owner), /Sign-in required/);
});

test('same-account login renews the session; unsubscribed views receive no later changes', async () => {
  const { auth, getClient } = fixture();
  await auth.getCurrentUser();
  const reasons = [];
  const unsubscribe = auth.onAuthChange(({ reason }) => reasons.push(reason));
  getClient().eventCallback({ eventType: 'login' });
  assert.deepEqual(reasons, ['refresh']);
  assert.equal((await auth.getCurrentUser()).status, 'authenticated');
  unsubscribe();
  await auth.signOut();
  assert.deepEqual(reasons, ['refresh']);
});

test('a failed view cannot interrupt logout or leave other views showing an account', async () => {
  const { auth } = fixture();
  await auth.getCurrentUser();
  const reasons = [];
  auth.onAuthChange(() => {
    throw new Error('Failed view');
  });
  auth.onAuthChange(({ reason }) => reasons.push(reason));
  await auth.signOut();
  assert.deepEqual(reasons, ['signed-out']);
  assert.equal((await auth.getCurrentUser()).status, 'anonymous');
});

test('logout signals invalidate other tabs before provider logout completes', async () => {
  const recipients = new Set();
  const channel = () => {
    let listener;
    const instance = {
      addEventListener: (_type, callback) => {
        listener = callback;
      },
      postMessage: (data) => {
        assert.equal(data, 'signed-out');
        for (const recipient of recipients) if (recipient !== instance) recipient.receive(data);
      },
      receive: (data) => listener({ data }),
    };
    recipients.add(instance);
    return instance;
  };
  const first = fixture({ channel });
  const second = fixture({ channel });
  await first.auth.getCurrentUser();
  await second.auth.getCurrentUser();
  let finishLogout;
  first.getClient().logoutRedirect = () =>
    new Promise((resolve) => {
      finishLogout = resolve;
    });
  const reasons = [];
  second.auth.onAuthChange(({ reason }) => reasons.push(reason));
  const pending = first.auth.signOut();
  assert.deepEqual(reasons, ['signed-out']);
  assert.equal((await second.auth.getCurrentUser()).status, 'anonymous');
  await assert.rejects(second.auth.getAccessToken(owner), /Sign-in required/);
  finishLogout();
  await pending;
});

test('logout during session response parsing cannot restore a stale verified owner', async () => {
  let parse;
  let parsingStarted;
  const ready = new Promise((resolve) => {
    parsingStarted = resolve;
  });
  const stale = fixture({
    fetchImpl: async (url) => {
      if (url.endsWith('Config'))
        return new Response(
          JSON.stringify({
            redirectPath: '/auth-probe.html',
            authority: 'https://test.ciamlogin.com/',
            clientId: 'app',
            scope: 'progress.access',
          }),
        );
      return {
        ok: true,
        json: () =>
          new Promise((resolve) => {
            parse = resolve;
            parsingStarted();
          }),
      };
    },
  });
  const pending = stale.auth.getCurrentUser();
  await ready;
  await stale.auth.signOut();
  parse({ userId: owner });
  assert.deepEqual(await pending, { status: 'anonymous', user: null });
  await assert.rejects(stale.auth.getAccessToken(owner));
});

test('a completed sign-in signal requires another tab to reverify the session', async () => {
  let receive;
  const { auth, getClient } = fixture({
    channel: () => ({
      addEventListener: (_event, handler) => {
        receive = handler;
      },
    }),
  });
  await auth.getCurrentUser();
  const original = getClient();
  const reasons = [];
  auth.onAuthChange(({ reason }) => reasons.push(reason));
  receive({ data: 'signed-in' });
  await new Promise(setImmediate);
  assert.deepEqual(reasons, ['account-changed']);
  await assert.rejects(auth.getAccessToken(owner), /Sign-in required/);
  assert.equal((await auth.getCurrentUser()).status, 'authenticated');
  assert.notEqual(getClient(), original);
});
