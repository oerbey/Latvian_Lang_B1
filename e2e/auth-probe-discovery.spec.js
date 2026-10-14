import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

const tenantId = '11111111-1111-4111-8111-111111111111';
const authority = 'https://example.ciamlogin.com/';
const issuerHost = `${tenantId}.ciamlogin.com`;

async function configureDiscovery(page, discoveredIssuerHost, callbackMode = null) {
  let nonce;
  const clientId = '33333333-3333-4333-8333-333333333333';
  const scope = 'api://22222222-2222-4222-8222-222222222222/progress.access';
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
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
    if (new URL(route.request().url()).pathname.endsWith('/oauth2/v2.0/token')) {
      const now = Math.floor(Date.now() / 1000);
      const idToken = [
        encode({ alg: 'RS256', typ: 'JWT' }),
        encode({
          iss: `https://${issuerHost}/${tenantId}/v2.0`,
          aud: clientId,
          tid: tenantId,
          oid: '44444444-4444-4444-8444-444444444444',
          sub: 'synthetic-user',
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
          access_token: 'synthetic-access-token',
        },
      });
    }
    if (route.request().isNavigationRequest()) {
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
  await expect(page.locator('#probe-status')).toContainText('Sign-in could not start');
  await expect(page).toHaveURL(/\/auth-probe\.html$/);
});

test('real MSAL callback failure shows safe codes and permits a fresh sign-in', async ({
  page,
}) => {
  await configureDiscovery(page, issuerHost, 'error');
  await page.goto('/auth-probe.html');
  await expect(page.locator('#probe-login')).toBeEnabled();
  await page.locator('#probe-login').click();
  await expect(page.locator('#probe-status')).toHaveText(
    'Sign-in could not complete (access_denied; AADSTS65001). Try sign-in again.',
  );
  await expect(page.locator('#probe-login')).toBeEnabled();
  await expect(page.locator('#probe-check')).toBeDisabled();
  await expect(page.locator('body')).not.toContainText('synthetic-private@example.com');
  await expect(page.locator('body')).not.toContainText('private-token');
});

test('real MSAL completes a synthetic callback and checks API access', async ({ page }) => {
  await configureDiscovery(page, issuerHost, 'success');
  await page.route('**/api/authProbe', (route) => {
    expect(route.request().headers().authorization).toBe('Bearer synthetic-access-token');
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto('/auth-probe.html');
  await expect(page.locator('#probe-login')).toBeEnabled();
  await page.locator('#probe-login').click();
  await expect(page.locator('#probe-status')).toHaveText(
    'Signed in. Check access to complete the test.',
  );
  await page.locator('#probe-check').click();
  await expect(page.locator('#probe-status')).toContainText('Access verified');
  await expect(page.locator('body')).not.toContainText('synthetic-access-token');
});
