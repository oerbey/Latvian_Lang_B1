import { test, expect } from '@playwright/test';

test('authentication test stays disabled without Dev configuration', async ({ page }) => {
  await page.route('**/api/authProbeConfig', (route) => route.fulfill({ status: 404, json: {} }));
  await page.goto('/auth-probe.html');
  await expect(page.locator('#probe-status')).toContainText('not enabled or configured');
  await expect(page.locator('#probe-login')).toBeDisabled();
  await expect(page.locator('#probe-check')).toBeDisabled();
});

test('authentication test sends an access token only to the probe and displays no claims', async ({
  page,
}, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/authProbeConfig', (route) =>
    route.fulfill({
      json: {
        authority: 'https://example.ciamlogin.com/',
        knownAuthorities: ['example.ciamlogin.com'],
        clientId: '33333333-3333-4333-8333-333333333333',
        scope: 'api://22222222-2222-4222-8222-222222222222/progress.access',
      },
    }),
  );
  await page.route('**/assets/vendor/msal-browser/msal-browser.min.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.msal = {
      PublicClientApplication: class {
        async initialize() {}
        async handleRedirectPromise() { return null; }
        getAllAccounts() { return [{}]; }
        setActiveAccount(account) { this.account = account; }
        getActiveAccount() { return this.account; }
        async acquireTokenSilent(request) {
          if (request.cacheLookupPolicy !== 2) throw new Error('Unexpected token renewal policy');
          return {accessToken: 'synthetic-access-token'};
        }
      },
      InteractionRequiredAuthError: class extends Error {},
      CacheLookupPolicy: { AccessTokenAndRefreshToken: 2 }
    };`,
    }),
  );
  let calls = 0;
  await page.route('**/api/authProbe', (route) => {
    calls++;
    expect(route.request().headers().authorization).toBe('Bearer synthetic-access-token');
    return route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/*Progress*', () => {
    throw new Error('Probe must not access progress');
  });
  await page.goto('/auth-probe.html');
  await expect(page.locator('#probe-check')).toBeEnabled();
  await page.locator('#probe-check').click();
  await expect(page.locator('#probe-status')).toContainText('Access verified');
  expect(calls).toBe(1);
  await expect(page.locator('body')).not.toContainText('synthetic-access-token');
  await page.screenshot({ path: testInfo.outputPath('auth-probe.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#probe-check')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('auth-probe-mobile.png'), fullPage: true });
  await page.route('**/api/authProbe', (route) =>
    route.fulfill({ status: 401, json: { error: 'authentication required' } }),
  );
  await page.locator('#probe-check').click();
  await expect(page.locator('#probe-status')).toContainText('Access was rejected');
  await page.route('**/api/authProbe', (route) => route.fulfill({ json: {} }));
  await page.locator('#probe-check').click();
  await expect(page.locator('#probe-status')).toContainText('Access was rejected');
  expect(pageErrors).toEqual([]);
});
