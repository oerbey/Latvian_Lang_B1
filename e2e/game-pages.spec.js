import { test, expect } from '@playwright/test';

test('english-latvian arcade page loads and starts a round', async ({ page }) => {
  await page.goto('/english-latvian-arcade.html');

  await expect(
    page.getByRole('heading', { name: 'English -> Latvian Word Catcher' }),
  ).toBeVisible();
  await expect(page.locator('#lv-en-arcade-canvas')).toBeVisible();
  await expect(page.locator('#arcade-left')).toHaveCount(1);
  await expect(page.locator('#arcade-right')).toHaveCount(1);

  await expect(page.locator('#arcade-mode')).toHaveText('Ready');
  await expect(page.locator('#start-btn')).toBeEnabled();

  await page.locator('#start-btn').click();

  await expect(page.locator('#arcade-mode')).toHaveText('Playing');
  await expect(page.locator('#restart-btn')).toBeEnabled();
  await expect(page.locator('#arcade-round')).toHaveText('0');
});

test('word quest map flow renders worlds and nodes', async ({ page }) => {
  await page.goto('/word-quest.html');

  await expect(page.locator('#wq-title-screen')).toBeVisible();
  await expect(page.locator('#wq-btn-play')).toBeVisible();

  await page.locator('#wq-btn-how').click();
  await expect(page.locator('#wq-how-modal')).toBeVisible();
  await page.locator('.wq-how-close-btn').click();
  await expect(page.locator('#wq-how-modal')).toBeHidden();

  await page.locator('#wq-btn-play').click();
  await expect(page.locator('#wq-map-screen')).toBeVisible();

  const worldCards = page.locator('#wq-map-grid .wq-world-card');
  await expect(worldCards).toHaveCount(5);

  await worldCards.first().click();

  await expect(page.locator('#wq-world-screen')).toBeVisible();
  await expect(page.locator('#wq-node-path .wq-node').first()).toBeVisible();
});
