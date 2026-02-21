import { test, expect } from '@playwright/test';

test('darbibas vardi page loads and toggles study mode controls', async ({ page }) => {
  await page.goto('/darbibas-vards.html');

  await expect(
    page.getByRole('heading', { name: 'Latviešu valoda — Darbības Vārdi' }),
  ).toBeVisible();
  await expect(page.locator('#btn-new')).toBeEnabled();
  await expect(page.locator('#speak-toggle')).toBeVisible();
  await expect(page.locator('#speak-toggle')).not.toBeChecked();
  await expect(page.locator('#mode-use-all')).toBeChecked();
  await expect(page.locator('#list-lv .word-card').first()).toBeVisible();
  await expect(page.locator('#list-tr .word-card').first()).toBeVisible();

  await page.locator('#speak-toggle').evaluate((node) => {
    node.checked = true;
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#speak-toggle')).toBeChecked();

  await page.locator('label[for="mode-locked-set"]').click();
  await expect(page.locator('#locked-controls')).toBeVisible();
});

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
  await page.keyboard.press('Escape');
  await expect(page.locator('#wq-how-modal')).toBeHidden();

  await page.locator('#wq-btn-play').click();
  await expect(page.locator('#wq-map-screen')).toBeVisible();

  const worldCards = page.locator('#wq-map-grid .wq-world-card');
  await expect(worldCards).toHaveCount(5);

  await worldCards.first().click();

  await expect(page.locator('#wq-world-screen')).toBeVisible();
  await expect(page.locator('#wq-node-path .wq-node').first()).toBeVisible();
});
