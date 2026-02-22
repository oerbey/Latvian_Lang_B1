import { test, expect } from '@playwright/test';

const homepagePreviewCards = [
  { title: 'Darbības Vārdi', preview: 'verbs_preview.png', href: 'darbibas-vards.html' },
  { title: 'Conjugation Sprint', preview: 'sprint_preview.png', href: 'conjugation-sprint.html' },
  { title: 'Endings Builder', preview: 'endings_preview.png', href: 'endings-builder.html' },
  { title: 'Passive Voice Builder', preview: 'passive_preview.png', href: 'passive-lab.html' },
  {
    title: 'Sentence Surgery — Ciešamā kārta',
    preview: null,
    href: 'sentence-surgery-passive.html',
  },
  { title: '⚔️ Word Quest — RPG Adventure', preview: null, href: 'word-quest.html' },
  { title: 'English -> Latvian Word Catcher', preview: null, href: 'english-latvian-arcade.html' },
  { title: 'Kas ir manā mājā?', preview: 'room_preview.png', href: 'decl6-detective.html' },
  { title: 'Travel Tracker', preview: 'travel_preview.png', href: 'travel-tracker.html' },
];

test('homepage loads and lists games', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hero-title')).toBeVisible();
  const cards = page.locator('#gamesGrid .dp-game-card');
  await expect(cards.first()).toBeVisible();

  expect(await cards.count()).toBeGreaterThanOrEqual(homepagePreviewCards.length);
  for (const expected of homepagePreviewCards) {
    const card = cards.filter({ hasText: expected.title }).first();
    await expect(card).toBeVisible();
    const art = card.locator('.dp-game-card__art');
    const icon = card.locator('.dp-game-card__art-icon');
    const href = await card.getAttribute('href');

    await expect(art).toBeVisible();
    await expect(icon).toBeVisible();
    expect(href).toContain(expected.href);

    const backgroundImage = await art.evaluate((el) => getComputedStyle(el).backgroundImage);
    if (expected.preview) {
      expect(backgroundImage).toContain(expected.preview);
    } else {
      expect(backgroundImage.length).toBeGreaterThan(0);
    }
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
