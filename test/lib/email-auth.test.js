import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmailAuth } from '../../src/lib/email-auth.js';
const owner = `extid:${'a'.repeat(64)}`;
function fixture() {
  let client;
  class Expired extends Error {}
  const sdk = {
    InteractionRequiredAuthError: Expired,
    CacheLookupPolicy: { AccessTokenAndRefreshToken: 2 },
    PublicClientApplication: class {
      constructor(config) {
        client = this;
        this.config = config;
        this.account = { homeAccountId: 'synthetic-A' };
      }
      async initialize() {}
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
  assert.equal(getClient().config.cache.cacheLocation, 'sessionStorage');
  assert.equal(await auth.getAccessToken(owner), 'synthetic-token');
  await assert.rejects(auth.getAccessToken(`extid:${'b'.repeat(64)}`));
  getClient().fail = true;
  await assert.rejects(auth.getAccessToken(owner));
  assert.equal((await auth.getCurrentUser()).status, 'reauth');
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
