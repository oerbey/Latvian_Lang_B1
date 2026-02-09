import { test, expect } from '@playwright/test';

const homepagePreviewCards = [
  { title: 'Darbības Vārdi', preview: 'verbs_preview.png', icon: 'book' },
  { title: 'Conjugation Sprint', preview: 'sprint_preview.png', icon: 'gamepad' },
  { title: 'Endings Builder', preview: 'endings_preview.png', icon: 'pencil' },
  { title: 'Passive Voice Builder', preview: 'passive_preview.png', icon: 'book' },
  { title: 'Sentence Surgery — Ciešamā kārta', preview: null, icon: 'pencil' },
  { title: '⚔️ Word Quest — RPG Adventure', preview: null, icon: 'star' },
  { title: 'English -> Latvian Word Catcher', preview: null, icon: 'stats' },
  { title: 'Kas ir manā mājā?', preview: 'room_preview.png', icon: 'home' },
  { title: 'Travel Tracker', preview: 'travel_preview.png', icon: 'map' },
];

test('homepage loads and lists games', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#homeTitle')).toBeVisible();
  const cards = page.locator('#gamesGrid .game-card');
  await expect(cards.first()).toBeVisible();

  expect(await cards.count()).toBeGreaterThanOrEqual(homepagePreviewCards.length);
  for (const expected of homepagePreviewCards) {
    const card = cards.filter({ hasText: expected.title }).first();
    await expect(card).toBeVisible();
    const art = card.locator('.game-card__art');
    const icon = card.locator('.game-card__art-icon img');

    await expect(art).toBeVisible();
    const backgroundImage = await art.evaluate((el) => getComputedStyle(el).backgroundImage);
    if (expected.preview) {
      expect(backgroundImage).toContain(expected.preview);
    } else {
      expect(backgroundImage).not.toContain('url(');
    }

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
  await expect(page.locator('#sspv-translationPanel')).toBeVisible();
  await expect(page.locator('#sspv-next')).toBeHidden();

  await page.getByRole('button', { name: 'Kā spēlēt / How to play' }).click();
  await expect(page.getByRole('heading', { name: 'Kā spēlēt / How to play' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  const sentenceTokens = page.locator('#sspv-sentenceTokens .sspv-token--sentence.is-editable');
  await expect(
    page.locator('#sspv-sentenceTokens .sspv-token--sentence.is-locked').first(),
  ).toBeVisible();
  const bankTokens = page.locator('#sspv-wordBank .sspv-token');

  await sentenceTokens.first().click();
  await bankTokens.first().click();
  await bankTokens.nth(1).dragTo(sentenceTokens.first());
  await page.locator('#sspv-check').click();

  await expect(page.locator('#sspv-feedback')).toContainText(/Pareizi|Vēl nav pareizi/);
  await expect(page.locator('#sspv-progressText')).toBeVisible();
});
