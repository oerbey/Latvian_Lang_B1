import { test, expect } from '@playwright/test';

test('migration handoff is hidden outside old Dev and requires synced sign-in', async ({
  page,
}) => {
  await page.goto('/word-quest.html');
  await expect(page.locator('#wq-migration-panel')).toBeHidden();
  await page.evaluate(async () => {
    const { createMigrationBridge, OLD_DEV_ORIGIN } =
      await import('../src/lib/migration-bridge.js');
    window.updateTestMigration = createMigrationBridge({ origin: OLD_DEV_ORIGIN });
    window.updateTestMigration(false, 'saved');
  });
  await expect(page.locator('#wq-migration-panel')).toBeHidden();
  await page.evaluate(() => window.updateTestMigration(true, 'pending'));
  await page.locator('#wq-migration-panel summary').click();
  await expect(page.locator('#wq-migration-generate')).toBeDisabled();
  await page.evaluate(() => window.updateTestMigration(true, 'saved'));
  await expect(page.locator('#wq-migration-generate')).toBeEnabled();
});

test('migration handoff displays a server snapshot, copies explicitly and clears on sign-out', async ({
  page,
}, testInfo) => {
  await page.route('**/api/migration/start', async (route) => {
    expect(route.request().postDataJSON()).toEqual({});
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'A'.repeat(43),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      }),
    });
  });
  await page.goto('/word-quest.html');
  await page.evaluate(async () => {
    const { createMigrationBridge, OLD_DEV_ORIGIN } =
      await import('../src/lib/migration-bridge.js');
    window.testCopiedToken = '';
    window.updateTestMigration = createMigrationBridge({
      origin: OLD_DEV_ORIGIN,
      clipboard: {
        writeText: async (value) => {
          window.testCopiedToken = value;
        },
      },
    });
    window.updateTestMigration(true, 'saved');
  });
  await page.locator('#wq-migration-panel summary').click();
  await page.locator('#wq-migration-generate').click();
  await expect(page.locator('#wq-migration-token')).toHaveValue('A'.repeat(43));
  await expect(page.locator('#wq-migration-status')).toContainText('Snapshot captured');
  expect(await page.evaluate(() => window.testCopiedToken)).toBe('');
  await page.locator('#wq-migration-copy').click();
  expect(await page.evaluate(() => window.testCopiedToken)).toBe('A'.repeat(43));
  await expect(page.locator('#wq-migration-status')).toContainText('Keep it private');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('migration-bridge.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#wq-migration-copy')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: testInfo.outputPath('migration-bridge-mobile.png'),
    fullPage: true,
  });
  await page.evaluate(() => window.updateTestMigration(false, 'anonymous'));
  await expect(page.locator('#wq-migration-panel')).toBeHidden();
  await expect(page.locator('#wq-migration-token')).toHaveValue('');
});

test('migration failures do not leave an earlier bearer token visible', async ({ page }) => {
  await page.goto('/word-quest.html');
  await page.evaluate(async () => {
    const { createMigrationBridge, OLD_DEV_ORIGIN } =
      await import('../src/lib/migration-bridge.js');
    let attempts = 0;
    window.updateTestMigration = createMigrationBridge({
      origin: OLD_DEV_ORIGIN,
      fetchImpl: async () => {
        attempts++;
        if (attempts > 1) return { ok: false, status: 404, json: async () => ({}) };
        return {
          ok: true,
          json: async () => ({
            token: 'B'.repeat(43),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 900000).toISOString(),
          }),
        };
      },
    });
    window.updateTestMigration(true, 'saved');
  });
  await page.locator('#wq-migration-panel summary').click();
  await page.locator('#wq-migration-generate').click();
  await expect(page.locator('#wq-migration-token')).toHaveValue('B'.repeat(43));
  await page.locator('#wq-migration-generate').click();
  await expect(page.locator('#wq-migration-token')).toHaveValue('');
  await expect(page.locator('#wq-migration-copy')).toBeHidden();
  await expect(page.locator('#wq-migration-status')).toContainText('not available');
});

test('migration handoff removes the bearer token when its redemption window expires', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/word-quest.html');
  await page.evaluate(async () => {
    const { createMigrationBridge, OLD_DEV_ORIGIN } =
      await import('../src/lib/migration-bridge.js');
    createMigrationBridge({
      origin: OLD_DEV_ORIGIN,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          token: 'C'.repeat(43),
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        }),
      }),
    })(true, 'saved');
  });
  await page.locator('#wq-migration-panel summary').click();
  await page.locator('#wq-migration-generate').click();
  await expect(page.locator('#wq-migration-token')).toHaveValue('C'.repeat(43));
  await page.clock.fastForward(900001);
  await expect(page.locator('#wq-migration-token')).toHaveValue('');
  await expect(page.locator('#wq-migration-copy')).toBeHidden();
  await expect(page.locator('#wq-migration-status')).toContainText('Token expired');
});
