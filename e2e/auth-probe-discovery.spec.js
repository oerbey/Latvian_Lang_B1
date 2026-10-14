import { test, expect } from '@playwright/test';

const tenantId = '11111111-1111-4111-8111-111111111111';
const authority = 'https://example.ciamlogin.com/';
const issuerHost = `${tenantId}.ciamlogin.com`;

async function configureDiscovery(page, discoveredIssuerHost) {
  await page.route('**/api/authProbeConfig', (route) =>
    route.fulfill({
      json: {
        authority,
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
    if (route.request().isNavigationRequest()) {
      return route.fulfill({ contentType: 'text/html', body: '<h1>Hosted sign-in fixture</h1>' });
    }
    return route.abort();
  });
}

test('real MSAL accepts the configured tenant issuer and starts hosted sign-in', async ({
  page,
}) => {
  await configureDiscovery(page, issuerHost);
  await page.goto('/auth-probe.html');
  await expect(page.locator('#probe-login')).toBeEnabled();
  await page.locator('#probe-login').click();
  await expect(page.getByRole('heading', { name: 'Hosted sign-in fixture' })).toBeVisible();
});

test('real MSAL rejects discovery with an unrelated issuer', async ({ page }) => {
  await configureDiscovery(page, 'unrelated.ciamlogin.com');
  await page.goto('/auth-probe.html');
  await expect(page.locator('#probe-login')).toBeEnabled();
  await page.locator('#probe-login').click();
  await expect(page.locator('#probe-status')).toHaveText(
    'Sign-in could not start. Please try again.',
  );
  await expect(page).toHaveURL(/\/auth-probe\.html$/);
});
