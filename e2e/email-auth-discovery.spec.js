import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { EXERCISES } from '../src/lib/exercise-registry.js';

const tenantId = '11111111-1111-4111-8111-111111111111';
const authority = 'https://example.ciamlogin.com/';
const issuerHost = `${tenantId}.ciamlogin.com`;

async function configureDiscovery(page, discoveredIssuerHost, callbackMode = null) {
  let nonce;
  let account = 'A';
  const clientId = '33333333-3333-4333-8333-333333333333';
  const scope = 'api://22222222-2222-4222-8222-222222222222/progress.access';
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  await page.route('**/api/authConfig', (route) =>
    route.fulfill({
      json: {
        authority,
        redirectPath: '/auth-probe.html',
        clientId: '33333333-3333-4333-8333-333333333333',
        scope: 'api://22222222-2222-4222-8222-222222222222/progress.access',
        knownAuthorities: ['example.ciamlogin.com', issuerHost],
      },
    }),
  );
  await page.route('https://example.ciamlogin.com/**', (route) => {
    if (route.request().url().includes('/.well-known/openid-configuration')) {
      return route.fulfill({
        json: {
          issuer: `https://${discoveredIssuerHost}/${tenantId}/v2.0`,
          authorization_endpoint: `${authority}${tenantId}/oauth2/v2.0/authorize`,
          token_endpoint: `${authority}${tenantId}/oauth2/v2.0/token`,
          end_session_endpoint: `${authority}${tenantId}/oauth2/v2.0/logout`,
          jwks_uri: `${authority}${tenantId}/discovery/v2.0/keys`,
        },
      });
    }
    if (new URL(route.request().url()).pathname.endsWith('/oauth2/v2.0/token')) {
      const now = Math.floor(Date.now() / 1000);
      const idToken = [
        encode({ alg: 'RS256', typ: 'JWT' }),
        encode({
          iss: `https://${issuerHost}/${tenantId}/v2.0`,
          aud: clientId,
          tid: tenantId,
          oid:
            account === 'A'
              ? '44444444-4444-4444-8444-444444444444'
              : '55555555-5555-4555-8555-555555555555',
          sub: `synthetic-user-${account}`,
          login_hint: 'synthetic-opaque-hint',
          nonce,
          iat: now,
          exp: now + 3600,
        }),
        'synthetic-signature',
      ].join('.');
      return route.fulfill({
        json: {
          token_type: 'Bearer',
          scope,
          expires_in: 3600,
          id_token: idToken,
          access_token: account === 'A' ? 'synthetic-access-token' : 'synthetic-access-token-B',
        },
      });
    }
    if (route.request().isNavigationRequest()) {
      const endpoint = new URL(route.request().url());
      if (endpoint.pathname.endsWith('/oauth2/v2.0/logout')) {
        expect(endpoint.searchParams.get('logout_hint')).toBe('synthetic-opaque-hint');
        return route.fulfill({
          status: 302,
          headers: { location: endpoint.searchParams.get('post_logout_redirect_uri') },
          body: '',
        });
      }
      if (callbackMode) {
        const request = new URL(route.request().url());
        const callback = new URL(request.searchParams.get('redirect_uri'));
        nonce = request.searchParams.get('nonce');
        const response =
          callbackMode === 'error'
            ? {
                error: 'access_denied',
                error_description: 'AADSTS65001: synthetic-private@example.com private-token',
              }
            : { code: 'synthetic-authorization-code' };
        callback.hash = new URLSearchParams({
          ...response,
          state: request.searchParams.get('state'),
        }).toString();
        return route.fulfill({ status: 302, headers: { location: callback.href }, body: '' });
      }
      return route.fulfill({ contentType: 'text/html', body: '<h1>Hosted sign-in fixture</h1>' });
    }
    return route.abort();
  });
  return {
    useAccount: (value) => {
      account = value;
    },
  };
}

test('real MSAL accepts the configured tenant issuer and starts hosted sign-in', async ({
  page,
}) => {
  await configureDiscovery(page, issuerHost);
  await page.goto('/word-quest.html');
  await expect(page.locator('#site-sign-in')).toBeEnabled();
  await page.locator('#site-sign-in').click();
  await expect(page.getByRole('heading', { name: 'Hosted sign-in fixture' })).toBeVisible();
});

test('real MSAL rejects discovery with an unrelated issuer', async ({ page }) => {
  await configureDiscovery(page, 'unrelated.ciamlogin.com');
  await page.goto('/word-quest.html');
  await expect(page.locator('#site-sign-in')).toBeEnabled();
  await page.locator('#site-sign-in').click();
  await expect(page.locator('#site-account-status')).toContainText('Sign-in could not start');
  await expect(page).toHaveURL(/\/word-quest\.html$/);
});

test('real MSAL callback failure shows safe codes and a safe return path', async ({ page }) => {
  await configureDiscovery(page, issuerHost, 'error');
  await page.goto('/word-quest.html');
  await expect(page.locator('#site-sign-in')).toBeEnabled();
  await page.locator('#site-sign-in').click();
  await expect(page.locator('#callback-status')).toHaveText(
    'Sign-in could not complete (access_denied; AADSTS65001). Use the return link to try again.',
  );
  await expect(page.getByRole('link', { name: 'Return to platform' })).toHaveAttribute(
    'href',
    '/word-quest.html',
  );
  await expect(page.locator('body')).not.toContainText('synthetic-private@example.com');
  await expect(page.locator('body')).not.toContainText('private-token');
});

test('real MSAL completes sign-in and hinted logout back to guest play', async ({ page }) => {
  await configureDiscovery(page, issuerHost, 'success');
  const userId = `extid:${'a'.repeat(64)}`;
  await page.route('**/api/authSession', (route) => {
    expect(route.request().headers()['x-latvian-authorization']).toBe(
      'Bearer synthetic-access-token',
    );
    expect(route.request().headers().authorization).toBeUndefined();
    return route.fulfill({ json: { userId } });
  });
  await page.route('**/api/getProgress?*', (route) => route.fulfill({ json: null }));
  await page.goto('/word-quest.html');
  await expect(page.locator('#site-sign-in')).toBeEnabled();
  await page.locator('#site-sign-in').click();
  await expect(page.locator('#wq-auth-label')).toHaveText('Signed in');
  await expect(page.locator('#wq-sync-status')).toContainText('New account');
  await expect(page.locator('body')).not.toContainText('synthetic-access-token');
  await page.locator('#site-sign-out').click();
  await expect(page.locator('#wq-auth-label')).toHaveText('Playing locally');
  await expect(page.locator('#wq-sync-status')).toContainText('Sign in to sync');
});

test('one real MSAL login works across pages and tabs; logout clears an active Word Quest battle', async ({
  page,
  context,
}) => {
  const identity = await configureDiscovery(context, issuerHost, 'success');
  const owners = { A: `extid:${'a'.repeat(64)}`, B: `extid:${'b'.repeat(64)}` };
  const accountFor = (route) =>
    route.request().headers()['x-latvian-authorization'] === 'Bearer synthetic-access-token-B'
      ? 'B'
      : 'A';
  await context.route('**/api/authSession', (route) =>
    route.fulfill({ json: { userId: owners[accountFor(route)] } }),
  );
  await context.route('**/api/getProgress?gameId=word-quest', (route) =>
    route.fulfill({
      json: {
        userId: owners[accountFor(route)],
        gameId: 'word-quest',
        revision: 1,
        data: {
          schemaVersion: 1,
          xp: accountFor(route) === 'A' ? 37 : 7,
          level: 1,
          streak: 0,
          bestStreak: 0,
          totalCorrect: 0,
          totalWrong: 0,
          worlds: {},
        },
      },
    }),
  );
  await context.route('**/api/getProgress?gameId=darbibas-vards', (route) =>
    route.fulfill({ body: 'null', contentType: 'application/json' }),
  );
  await page.goto('/index.html');
  const quest = await context.newPage();
  await quest.goto('/word-quest.html');
  await expect(quest.locator('#wq-sync-status')).toHaveText(
    'Sign in to sync progress across devices.',
  );
  await page.locator('#site-sign-in').click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'authenticated');
  await expect(quest.locator('#wq-auth-label')).toHaveText('Signed in');
  await expect(quest.locator('#wq-sync-status')).toContainText('Cloud sync ready');
  expect(await quest.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(37);
  const verbs = await context.newPage();
  await verbs.goto('/darbibas-vards.html');
  await expect(verbs.locator('#site-account')).toHaveAttribute('data-auth-status', 'authenticated');
  await quest.locator('#wq-btn-play').click();
  await quest.locator('.wq-world-card').first().click();
  await quest.locator('#wq-node-path .wq-node').first().click();
  await expect(quest.locator('#wq-battle-screen')).toBeVisible();
  await page.locator('#site-sign-out').click();
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'anonymous');
  await expect(verbs.locator('#site-account')).toHaveAttribute('data-auth-status', 'anonymous');
  await expect(quest.locator('#wq-auth-label')).toHaveText('Playing locally');
  await expect(quest.locator('#wq-battle-screen')).toBeHidden();
  expect(await quest.evaluate(() => JSON.parse(window.render_game_to_text()).battle)).toBe(null);
  await quest.keyboard.press('Enter');
  expect(await quest.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(0);
  await verbs.reload();
  await expect(verbs.locator('#site-account')).toHaveAttribute('data-auth-status', 'anonymous');
  identity.useAccount('B');
  await page.locator('#site-sign-in').click();
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'authenticated');
  await expect(quest.locator('#wq-auth-label')).toHaveText('Signed in');
  await expect(quest.locator('#wq-sync-status')).toContainText('Cloud sync ready');
  expect(await quest.evaluate(() => JSON.parse(window.render_game_to_text()).xp)).toBe(7);
});

test('sign-in returns to the original matching exercise and navigation fits a phone', async ({
  page,
  context,
}, testInfo) => {
  await configureDiscovery(context, issuerHost, 'success');
  await context.route('**/api/authSession', (route) =>
    route.fulfill({ json: { userId: `extid:${'a'.repeat(64)}` } }),
  );
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/darbibas-vards.html');
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'anonymous');
  await page.locator('#site-sign-in').click();
  await expect(page).toHaveURL(/\/darbibas-vards\.html$/);
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'authenticated');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#list-lv .word-card')).toHaveCount(10);
  await page.locator('#site-sign-out').scrollIntoViewIfNeeded();
  await expect(page.locator('#site-sign-out')).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath('platform-account-mobile.png'),
    fullPage: false,
  });
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#site-sign-out')).toHaveCSS('background-color', 'rgb(21, 27, 46)');
  await expect(page.locator('#site-sign-out')).toHaveCSS('color', 'rgb(241, 245, 249)');
  await page.screenshot({
    path: testInfo.outputPath('platform-account-mobile-dark.png'),
    fullPage: false,
  });
  await page.evaluate(() => {
    document.documentElement.lang = 'ru';
  });
  await expect(page.locator('#site-progress-link')).toHaveText('Мой прогресс');
  await page.locator('#site-progress-link').click();
  await expect(page.getByRole('heading', { name: 'My Progress', exact: true })).toBeVisible();
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'authenticated');
  await expect(page.getByRole('link', { name: 'Continue Word Quest' })).toHaveAttribute(
    'href',
    'word-quest.html',
  );
  await page.locator('#site-sign-out').click();
  await expect(page).toHaveURL(/\/my-progress\.html$/);
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'anonymous');
  expect(errors).toEqual([]);
});

test('callback rejects a stored external return destination', async ({ page }) => {
  await configureDiscovery(page, issuerHost);
  await page.goto('/index.html');
  await page.evaluate(() => sessionStorage.setItem('llb1:auth:return', '//evil.test'));
  await page.goto('/auth-probe.html');
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'anonymous');
});

test('unavailable authentication leaves guest exercises playable and can retry sign-in', async ({
  page,
}) => {
  await page.route('**/api/authConfig', (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto('/darbibas-vards.html');
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'unavailable');
  await expect(page.locator('#list-lv .word-card').first()).toBeVisible();
  await page.locator('#site-sign-in').click();
  await expect(page.locator('#site-account')).toHaveAttribute('data-auth-status', 'unavailable');
  await expect(page.locator('#site-sign-in')).toBeEnabled();
  await expect(page.locator('#list-lv .word-card').first()).toBeVisible();
});

test('Darbības Vārdi restores a partial board across devices and keeps legacy guest stats apart', async ({
  page,
  context,
  browser,
  baseURL,
}, testInfo) => {
  const owner = `extid:${'a'.repeat(64)}`;
  let record = null;
  let writes = 0;
  async function connectDevice(device) {
    await configureDiscovery(device, issuerHost, 'success');
    await device.route('**/api/authSession', (route) => route.fulfill({ json: { userId: owner } }));
    await device.route('**/api/getProgress?gameId=darbibas-vards', (route) =>
      route.fulfill({
        body: JSON.stringify(record),
        contentType: 'application/json',
      }),
    );
    await device.route('**/api/saveProgress', (route) => {
      const body = route.request().postDataJSON();
      expect(body.gameId).toBe('darbibas-vards');
      expect(body.expectedRevision).toBe(record?.revision ?? 0);
      record = {
        userId: owner,
        gameId: body.gameId,
        revision: body.expectedRevision + 1,
        data: body.data,
      };
      writes++;
      return route.fulfill({ json: { ok: true, item: record } });
    });
  }
  async function signIn(devicePage) {
    await devicePage.locator('#site-sign-in').click();
    await expect(devicePage.locator('#dv-sync-status')).toHaveText(
      /Cloud sync is ready|Saved to cloud/,
    );
  }
  async function pair(devicePage, left, right) {
    await devicePage.locator(`#list-lv [data-key="${left}"]`).press('Enter');
    await devicePage.locator(`#list-tr [data-key="${right}"]`).press('Enter');
  }

  await connectDevice(context);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      'dv_stats',
      JSON.stringify({
        'legacy|example': { correct: 7, incorrect: 0, lastSeen: 1000 },
      }),
    );
  });
  await page.goto('/darbibas-vards.html');
  await expect(page.locator('#dv-learning-summary')).toContainText('7 attempts');
  await expect(page.locator('#dv-coverage')).toContainText('0 of');
  await signIn(page);
  await expect(page.locator('#dv-learning-summary')).toContainText('0 attempts');
  await page.locator('#count-select').selectOption('6');
  await page.locator('label[for="mode-locked-set"]').click();
  await pair(page, 0, 1);
  await pair(page, 0, 0);
  await page.locator('#language-select').selectOption('ru');
  await expect(page.locator('#dv-sync-status')).toHaveText('Saved to cloud.');
  await expect(page.locator('#dv-learning-summary')).toContainText(
    '2 attempts · 50% accuracy · 1 word practised',
  );
  await expect(page.locator('#list-lv [data-key="0"]')).toHaveAttribute('aria-disabled', 'true');
  const saved = structuredClone(record.data);
  expect(saved.lockedSet.cursor).toBe(6);
  const savesBeforeRestore = writes;
  const device = await browser.newContext({ baseURL, serviceWorkers: 'block' });
  try {
    await connectDevice(device);
    const second = await device.newPage();
    await second.goto('/darbibas-vards.html');
    await signIn(second);
    await expect(second.locator('#mode-locked-set')).toBeChecked();
    await expect(second.locator('#language-select')).toHaveValue('ru');
    await expect(second.locator('#count-select')).toHaveValue('6');
    await expect(second.locator('#score')).toHaveText('Pareizi: 1 | Nepareizi: 1');
    await expect(second.locator('#list-tr [data-key="0"]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    const current = await second.evaluate(() => JSON.parse(window.render_game_to_text()));
    expect(current.currentBoard).toEqual(saved.currentBoard);
    expect(current.lockedSet).toEqual(saved.lockedSet);
    await second.reload();
    await expect(second.locator('#score')).toHaveText('Pareizi: 1 | Nepareizi: 1');
    expect(writes).toBe(savesBeforeRestore);
    await second.locator('#score').scrollIntoViewIfNeeded();
    await second.screenshot({ path: testInfo.outputPath('restored-matching-board.png') });
    await pair(second, 1, 1);
    await expect(second.locator('#dv-sync-status')).toHaveText('Saved to cloud.');
    expect(record.data.currentBoard.matchedIds).toHaveLength(2);
  } finally {
    await device.close();
  }
  await page.locator('#site-sign-out').click();
  await expect(page.locator('#dv-learning-summary')).toContainText('7 attempts');
  expect(errors).toEqual([]);
});

test('My Progress shows read-only guest history and fits a phone in all three languages', async ({
  page,
  context,
}, testInfo) => {
  await configureDiscovery(context, issuerHost, 'success');
  await page.addInitScript(() => {
    localStorage.setItem(
      'llb1:word-quest:v2:guest',
      JSON.stringify({ xp: 17, totalCorrect: 3, totalWrong: 1 }),
    );
    localStorage.setItem(
      'dv_stats',
      JSON.stringify({ 'būt|to be': { correct: 5, incorrect: 0, lastSeen: 1735689600000 } }),
    );
    localStorage.setItem(
      `llb1:progress:v1:word-quest:extid:${'a'.repeat(64)}`,
      JSON.stringify({ data: { xp: 999 }, revision: 1, pending: false }),
    );
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-progress.html');
  await expect(page.locator('#progress-notice')).toContainText('playing as a guest');
  const quest = page.getByRole('article', { name: 'Word Quest' });
  await expect(quest.getByText('75%', { exact: true })).toBeVisible();
  await expect(quest.getByText('17', { exact: true })).toBeVisible();
  await expect(quest.getByText('999', { exact: true })).toHaveCount(0);
  await expect(quest.getByRole('link', { name: 'Continue Word Quest' })).toHaveAttribute(
    'href',
    'word-quest.html',
  );
  const verbs = page.getByRole('article', { name: 'Darbības Vārdi' });
  await expect(verbs.getByText('100%', { exact: true })).toBeVisible();
  await expect(verbs.getByText('1 of 358')).toBeVisible();
  await expect(page.locator('#progress-catalogue li')).toHaveCount(19);
  expect(
    await page.evaluate(() => [
      localStorage.getItem('llb1:progress:v1:word-quest:guest'),
      localStorage.getItem('llb1:progress:v1:darbibas-vards:guest'),
    ]),
  ).toEqual([null, null]);
  await page.screenshot({ path: testInfo.outputPath('my-progress-mobile.png') });
  const locale = page.locator('#progress-language');
  for (const [code, title] of [
    ['lv', 'Mans progress'],
    ['ru', 'Мой прогресс'],
    ['en', 'My Progress'],
  ]) {
    await locale.selectOption(code);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await context.setOffline(true);
  await expect(page.locator('#progress-notice')).toContainText('offline');
  await expect(quest.getByText('17', { exact: true })).toBeVisible();
});

test('My Progress loads account summaries, retries partial results and clears them on cross-tab logout', async ({
  page,
  context,
}, testInfo) => {
  await configureDiscovery(context, issuerHost, 'success');
  const owner = `extid:${'a'.repeat(64)}`;
  await context.route('**/api/authSession', (route) => route.fulfill({ json: { userId: owner } }));
  let matchingStatus = 'unavailable';
  let delaySummary = false;
  let finishSummary;
  let summaryStarted;
  const delayedSummary = new Promise((resolve) => (finishSummary = resolve));
  const receivedSummary = new Promise((resolve) => (summaryStarted = resolve));
  await context.route('**/api/getProgressSummary', async (route) => {
    if (delaySummary) {
      summaryStarted();
      await delayedSummary;
    }
    await route
      .fulfill({
        json: {
          userId: owner,
          exercises: EXERCISES.map(({ id, tracking }) => {
            const status =
              id === 'word-quest'
                ? 'saved'
                : id === 'darbibas-vards'
                  ? matchingStatus
                  : 'not-connected';
            const summary =
              id === 'word-quest'
                ? {
                    xp: 83,
                    bestStreak: 8,
                    attempts: 10,
                    correct: 8,
                    accuracy: 80,
                    completion: { completed: 3, total: 49 },
                  }
                : {
                    attempts: 12,
                    correct: 9,
                    accuracy: 75,
                    coverage: { practised: 6, total: 358 },
                    wordsPractised: 6,
                  };
            return { gameId: id, tracking, status, summary: status === 'saved' ? summary : null };
          }),
        },
      })
      .catch((error) => {
        if (!delaySummary) throw error;
      });
  });
  await page.goto('/index.html');
  const dashboard = await context.newPage();
  await dashboard.goto('/my-progress.html');
  await expect(dashboard.getByRole('link', { name: 'Start Word Quest' })).toBeVisible();
  await page.locator('#site-sign-in').click();
  const quest = dashboard.getByRole('article', { name: 'Word Quest' });
  const verbs = dashboard.getByRole('article', { name: 'Darbības Vārdi' });
  await expect(quest.getByText('83', { exact: true })).toBeVisible();
  await expect(quest.getByText('3 of 49')).toBeVisible();
  await expect(verbs.getByText('Progress unavailable')).toBeVisible();
  const retry = dashboard.getByRole('button', { name: 'Try again' });
  matchingStatus = 'not-started';
  await retry.click();
  await expect(verbs.getByRole('link', { name: 'Start Darbības Vārdi' })).toBeVisible();
  await expect(retry).toBeHidden();
  matchingStatus = 'saved';
  await dashboard.reload();
  await expect(verbs.getByText('6 of 358')).toBeVisible();
  await expect(verbs.getByText('75%', { exact: true })).toBeVisible();
  await dashboard.screenshot({ path: testInfo.outputPath('my-progress-account.png') });

  await dashboard.evaluate((userId) => {
    localStorage.setItem(
      `llb1:progress:v1:word-quest:${userId}`,
      JSON.stringify({ data: { xp: 62 }, revision: 1, pending: false }),
    );
    localStorage.setItem('llb1:word-quest:v2:guest', JSON.stringify({ xp: 16 }));
  }, owner);
  await context.setOffline(true);
  await expect(quest.getByText('Account copy on this browser')).toBeVisible();
  await expect(quest.getByText('62', { exact: true })).toBeVisible();
  await expect(quest.getByText('16', { exact: true })).toHaveCount(0);
  await expect(verbs.getByText('Progress unavailable')).toBeVisible();

  delaySummary = true;
  try {
    await context.setOffline(false);
    await receivedSummary;
    await page.locator('#site-sign-out').click();
    await expect(quest.getByText('16', { exact: true })).toBeVisible();
  } finally {
    finishSummary();
  }
  await expect(quest.getByText('83', { exact: true })).toHaveCount(0);
  await expect(verbs.getByText('6 of 358')).toHaveCount(0);
});
