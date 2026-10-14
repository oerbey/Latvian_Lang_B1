import { test, expect } from '@playwright/test';
const owners = { A: `extid:${'a'.repeat(64)}`, B: `extid:${'b'.repeat(64)}` };
const state = (xp) => ({
  schemaVersion: 1,
  xp,
  level: 1,
  streak: 0,
  bestStreak: 0,
  totalCorrect: 0,
  totalWrong: 0,
  worlds: {},
});

async function fixture(
  page,
  { account = 'A', records = new Map(), loadHook, saveHook, expired = false } = {},
) {
  await page.addInitScript((initial) => {
    if (!sessionStorage.getItem('fixture-started')) {
      sessionStorage.setItem('fixture-started', 'yes');
      if (initial) sessionStorage.setItem('fixture-account', initial);
    }
  }, account);
  await page.route('**/api/authConfig', (route) =>
    route.fulfill({
      json: {
        authority: 'https://example.ciamlogin.com/',
        redirectPath: '/auth-probe.html',
        clientId: '33333333-3333-4333-8333-333333333333',
        knownAuthorities: ['example.ciamlogin.com'],
        scope: 'api://22222222-2222-4222-8222-222222222222/progress.access',
      },
    }),
  );
  await page.route('**/assets/vendor/msal-browser/msal-browser.min.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    window.msal = {
      InteractionRequiredAuthError: class extends Error {},
      CacheLookupPolicy: { AccessTokenAndRefreshToken: 2 },
      PublicClientApplication: class {
        constructor() { const id = sessionStorage.getItem('fixture-account'); this.account = id ? {homeAccountId:id} : null; }
        async initialize() {}
        async handleRedirectPromise() { return null; }
        getAllAccounts() { return this.account ? [this.account] : []; }
        getActiveAccount() { return this.account; }
        setActiveAccount(account) { this.account = account; }
        async acquireTokenSilent(request) {
          if (${expired} || window.fixtureExpired) throw new window.msal.InteractionRequiredAuthError();
          if (request.cacheLookupPolicy !== 2) throw new Error('Unexpected policy');
          return {accessToken: 'token-' + request.account.homeAccountId};
        }
        async loginRedirect() { sessionStorage.setItem('fixture-account', sessionStorage.getItem('fixture-next') || 'A'); location.href = '/auth-probe.html'; }
        async logoutRedirect() { sessionStorage.removeItem('fixture-account'); this.account = null; location.href = '/auth-probe.html'; }
        async clearCache() { sessionStorage.removeItem('fixture-account'); this.account = null; }
      }
    };`,
    }),
  );
  const getOwner = (route) => {
    expect(route.request().headers().authorization).toBeUndefined();
    const account = route
      .request()
      .headers()
      ['x-latvian-authorization']?.replace('Bearer token-', '');
    expect(['A', 'B']).toContain(account);
    return owners[account];
  };
  await page.route('**/api/authSession', (route) =>
    route.fulfill({ json: { userId: getOwner(route) } }),
  );
  await page.route('**/api/getProgress?*', async (route) => {
    const owner = getOwner(route);
    if (loadHook && (await loadHook(route, owner))) return;
    await route.fulfill({ json: records.get(owner) || null });
  });
  const saves = [];
  await page.route('**/api/saveProgress', async (route) => {
    const owner = getOwner(route);
    const body = route.request().postDataJSON();
    saves.push({ owner, body });
    if (saveHook && (await saveHook(route, owner, body))) return;
    const current = records.get(owner);
    if (body.expectedRevision !== (current?.revision || 0))
      return route.fulfill({ status: 409, json: { current } });
    const item = {
      userId: owner,
      gameId: 'word-quest',
      revision: body.expectedRevision + 1,
      data: body.data,
    };
    records.set(owner, item);
    await route.fulfill({ json: { ok: true, item } });
  });
  await page.route('**/.auth/**', () => {
    throw new Error('Legacy authentication must not be used');
  });
  return { records, saves };
}

async function earnXP(page) {
  await page.locator('#wq-btn-play').click();
  await page.locator('.wq-world-card').filter({ hasText: 'Coming Verb Quest' }).click();
  await page.locator('#wq-node-path .wq-node').first().click();
  await expect(page.locator('#wq-enemy-label')).toHaveText('Meaning challenge');
  await page.screenshot({ path: test.info().outputPath('battle.png'), fullPage: true });
  for (let index = 0; index < 3; index++) {
    const game = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    await page.getByRole('button', { name: game.battle.challenge.correct, exact: true }).click();
    await expect(page.locator('#wq-feedback-text')).toHaveText('Correct!');
    await page.locator('#wq-btn-next-battle').click();
  }
  await expect(page.locator('#wq-result-screen')).toBeVisible();
}
async function returnTitle(page) {
  await page.locator('#wq-btn-to-world').click();
  await page.locator('#wq-btn-back-map').click();
  await page.locator('#wq-btn-back-title').click();
}

test('signed-in XP saves/restores; guest and second account progress remain separate', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const { records, saves } = await fixture(page);
  await page.addInitScript(() =>
    localStorage.setItem('llb1:word-quest', JSON.stringify({ xp: 999, level: 9 })),
  );
  await page.goto('/word-quest.html');
  await expect(page.locator('#wq-sync-status')).toContainText('New account');
  await earnXP(page);
  await expect(page.locator('#wq-sync-status')).toHaveText('Saved to cloud.');
  const xpA = records.get(owners.A).data.xp;
  expect(xpA).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('#wq-sync-status')).toContainText('Cloud sync ready');
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(xpA);
  await page.screenshot({ path: testInfo.outputPath('signed-in-desktop.png'), fullPage: true });
  await page.locator('#wq-logout-link').click();
  await expect(page.locator('#wq-sync-status')).toHaveText(
    'Sign in to sync progress across devices.',
  );
  await expect(page.locator('#wq-auth-label')).toHaveText('Playing locally');
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(0);
  const savedCount = saves.length;
  await earnXP(page);
  await returnTitle(page);
  expect(saves).toHaveLength(savedCount);
  const guestXP = await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp);
  await page.evaluate(() => sessionStorage.setItem('fixture-next', 'B'));
  await page.locator('#wq-login-link').click();
  await expect(page.locator('#wq-sync-status')).toContainText('New account');
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(0);
  expect(records.has(owners.B)).toBe(false);
  await earnXP(page);
  await expect(page.locator('#wq-sync-status')).toHaveText('Saved to cloud.');
  expect(saves.at(-1).owner).toBe(owners.B);
  await returnTitle(page);
  await page.locator('#wq-logout-link').click();
  await expect(page.locator('#wq-sync-status')).toHaveText(
    'Sign in to sync progress across devices.',
  );
  await expect(page.locator('#wq-auth-label')).toHaveText('Playing locally');
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(guestXP);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('guest-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('expired renewal retains account local progress without a blind cloud write', async ({
  page,
}) => {
  const { saves } = await fixture(page);
  await page.goto('/word-quest.html');
  await expect(page.locator('#wq-sync-status')).toContainText('New account');
  await page.evaluate(() => {
    window.fixtureExpired = true;
  });
  await earnXP(page);
  await expect(page.locator('#wq-sync-status')).toContainText('Sign in again');
  expect(saves).toHaveLength(0);
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBeGreaterThan(0);
  await returnTitle(page);
  await expect(page.locator('#wq-login-link')).toHaveText('Sign in again');
});

test('logout during an outstanding load ignores the old account response', async ({ page }) => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const { saves } = await fixture(page, {
    loadHook: async (route) => {
      await pending;
      await route
        .fulfill({ json: { userId: owners.A, gameId: 'word-quest', revision: 4, data: state(88) } })
        .catch(() => {});
      return true;
    },
  });
  await page.goto('/word-quest.html');
  await expect(page.locator('#wq-auth-label')).toHaveText('Signed in');
  await expect(page.locator('#wq-sync-status')).toHaveText('Loading cloud progress…');
  await page.locator('#wq-logout-link').click();
  await expect(page.locator('#wq-sync-status')).toHaveText(
    'Sign in to sync progress across devices.',
  );
  await expect(page.locator('#wq-auth-label')).toHaveText('Playing locally');
  release();
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(0);
  expect(saves).toHaveLength(0);
});

test('revision conflict requires an explicit choice before any retry', async ({ page }) => {
  const { saves } = await fixture(page, {
    saveHook: async (route) => {
      await route.fulfill({
        status: 409,
        json: { current: { userId: owners.A, gameId: 'word-quest', revision: 3, data: state(77) } },
      });
      return true;
    },
  });
  await page.goto('/word-quest.html');
  await expect(page.locator('#wq-sync-status')).toContainText('New account');
  await earnXP(page);
  await expect(page.locator('#wq-sync-modal')).toBeVisible();
  expect(saves).toHaveLength(1);
  await page.locator('#wq-sync-use-cloud').click();
  await expect(page.locator('#wq-sync-status')).toHaveText('Cloud progress restored.');
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(77);
  expect(saves).toHaveLength(1);
});

test('logout during a pending save cannot apply its response to another account', async ({
  page,
}) => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const { saves } = await fixture(page, {
    saveHook: async (route, owner, body) => {
      await pending;
      await route
        .fulfill({
          json: {
            ok: true,
            item: { userId: owner, gameId: 'word-quest', revision: 9, data: body.data },
          },
        })
        .catch(() => {});
      return true;
    },
  });
  await page.goto('/word-quest.html');
  await expect(page.locator('#wq-sync-status')).toContainText('New account');
  await earnXP(page);
  await expect(page.locator('#wq-sync-status')).toHaveText('Saving to cloud…');
  await returnTitle(page);
  await page.locator('#wq-logout-link').click();
  await expect(page.locator('#wq-sync-status')).toHaveText(
    'Sign in to sync progress across devices.',
  );
  await page.evaluate(() => sessionStorage.setItem('fixture-next', 'B'));
  await page.locator('#wq-login-link').click();
  await expect(page.locator('#wq-sync-status')).toContainText('New account');
  release();
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(0);
  expect(saves).toHaveLength(1);
  expect(saves[0].owner).toBe(owners.A);
});

test('configuration failure preserves guest play offline without cloud requests', async ({
  page,
}) => {
  await fixture(page, { account: null });
  await page.route('**/api/authConfig', (route) => route.fulfill({ status: 503, json: {} }));
  await page.route('**/api/*Progress*', () => {
    throw new Error('Guest must not access cloud progress');
  });
  await page.goto('/word-quest.html');
  await expect(page.locator('#wq-sync-status')).toContainText('keep playing locally');
  await earnXP(page);
  const guestXP = await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp);
  expect(guestXP).toBeGreaterThan(0);
  await returnTitle(page);
  await page.context().setOffline(true);
  await earnXP(page);
  expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBeGreaterThan(
    guestXP,
  );
});

test.describe('cached guest offline play', () => {
  test.use({ serviceWorkers: 'allow' });
  test('guest progress and visited battle data survive an offline refresh', async ({ page }) => {
    await page.goto('/word-quest.html');
    await expect(page.locator('#wq-btn-play')).toBeEnabled();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
        );
    });
    await earnXP(page);
    await returnTitle(page);
    const xp = await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp);
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.locator('#wq-btn-play')).toBeEnabled();
    expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(xp);
    await earnXP(page);
    expect(await page.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBeGreaterThan(
      xp,
    );
  });
});
