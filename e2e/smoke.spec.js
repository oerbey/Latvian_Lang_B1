import { test, expect } from '@playwright/test';

const homepagePreviewCards = [
  { preview: 'verbs_preview.png', icon: 'book' },
  { preview: 'sprint_preview.png', icon: 'gamepad' },
  { preview: 'endings_preview.png', icon: 'pencil' },
  { preview: 'passive_preview.png', icon: 'book' },
  { preview: 'sentence_surgery_preview.svg', icon: 'pencil' },
  { preview: 'room_preview.png', icon: 'home' },
  { preview: 'travel_preview.png', icon: 'map' },
];

test('homepage loads and lists games', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#homeTitle')).toBeVisible();
  const cards = page.locator('#gamesGrid .game-card');
  await expect(cards.first()).toBeVisible();

  expect(await cards.count()).toBeGreaterThanOrEqual(homepagePreviewCards.length);
  for (const [index, expected] of homepagePreviewCards.entries()) {
    const card = cards.nth(index);
    const art = card.locator('.game-card__art');
    const icon = card.locator('.game-card__art-icon img');

    await expect(art).toBeVisible();
    const backgroundImage = await art.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(backgroundImage).toContain(expected.preview);

    await expect(icon).toBeVisible();
    const iconSrc = await icon.getAttribute('src');
    expect(iconSrc).toContain(`/assets/icons/${expected.icon}.svg`);
    expect(iconSrc).not.toContain('/info.svg');
  }
});

test('conjugation sprint loads and shows choices', async ({ page }) => {
  await page.goto('/conjugation-sprint.html');
  const question = page.locator('#qtext');
  await expect(question).not.toHaveText('Loading…');
  const choices = page.locator('#choices button');
  await expect(choices.first()).toBeVisible();
  await choices.first().click();
  await expect(page.locator('#score')).toBeVisible();
});

test('sentence surgery page loads and can check a round', async ({ page }) => {
  await page.goto('/sentence-surgery-passive.html');
  await expect(page.locator('#sspv-sentenceTokens .sspv-token').first()).toBeVisible();

  const sentenceTokens = page.locator('#sspv-sentenceTokens .sspv-token');
  const bankTokens = page.locator('#sspv-wordBank .sspv-token');

  await sentenceTokens.first().click();
  await bankTokens.first().click();
  await page.locator('#sspv-check').click();

  await expect(page.locator('#sspv-feedback')).toContainText(/Pareizi|Vēl nav pareizi/);
  await expect(page.locator('#sspv-progressText')).toBeVisible();
});
