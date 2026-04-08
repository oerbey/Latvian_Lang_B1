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

test('conjugation sprint supports timed and untimed play modes', async ({ page }) => {
  await page.goto('/conjugation-sprint.html');
  const question = page.locator('#qtext');
  await expect(question).not.toHaveText('Loading…');

  const choices = page.locator('#choices button');
  await expect(choices).toHaveCount(4);

  const texts = await choices.allInnerTexts();
  expect(texts.every((text) => text.trim().length > 0)).toBe(true);

  const timer = page.locator('#timer');
  const startTimed = page.locator('#startTimed');
  await expect(timer).toBeVisible();
  await expect(timer).toContainText('timer off');
  await expect(startTimed).toBeHidden();

  await page.selectOption('#paceMode', 'timed');
  await expect(timer).toContainText('timer ready');
  await expect(startTimed).toBeVisible();
  await expect(startTimed).toBeEnabled();

  const timedQuestion = await question.innerText();
  await page.waitForTimeout(1400);
  await expect(question).toHaveText(timedQuestion);
  await expect(timer).toContainText('timer ready');

  await startTimed.click();
  const timerBefore = await timer.innerText();
  await page.waitForTimeout(1100);
  const timerAfter = await timer.innerText();
  expect(timerBefore).not.toEqual(timerAfter);

  await expect
    .poll(async () => (await question.innerText()) !== timedQuestion, { timeout: 10000 })
    .toBe(true);
  await expect(page.locator('#feedback')).toBeVisible();

  await page.selectOption('#paceMode', 'untimed');
  await expect(timer).toContainText('timer off');
  await expect(startTimed).toBeHidden();
  await expect(choices).toHaveCount(4);

  const untimedQuestion = await question.innerText();
  await page.waitForTimeout(8200);
  await expect(question).toHaveText(untimedQuestion);

  await choices.first().click();
  await expect(page.locator('#feedback')).toBeVisible();
  await expect
    .poll(async () => (await question.innerText()) !== untimedQuestion, { timeout: 3000 })
    .toBe(true);
});

test('endings builder shows instructions, target context, and keyboard check flow', async ({
  page,
}) => {
  await page.goto('/endings-builder.html');
  await expect(page.locator('[data-eb-heading]')).toBeVisible();
  await expect(page.locator('[data-eb-round-brief]')).toBeVisible();
  await expect(page.locator('[data-eb-round-brief]')).toContainText(/Raunds|Round/);
  await expect(page.locator('#ebBoard .eb-slot')).toBeVisible();
  await expect(page.locator('#ebOptions .eb-ending').first()).toBeVisible();
  await expect(page.locator('.eb-shell')).toBeVisible();
  await expect(page.getByRole('button', { name: /Izlaist|Skip/ })).toBeVisible();

  const howTo = page.locator('.eb-howto');
  await expect(howTo).toBeVisible();
  await howTo.locator('summary').click();
  await expect(howTo).toHaveAttribute('open', '');
  await expect(howTo).toContainText('Latviski');
  await expect(howTo).toContainText('English');

  const hits = page.locator('.eb-shell__stat[data-value="hits"] .eb-shell__value');
  const slot = page.locator('#ebBoard .eb-slot');
  await expect(hits).toHaveText('0/0');
  await page.locator('#ebOptions .eb-ending').first().click();
  await expect(slot).toHaveClass(/has-ending/);
  await expect(hits).not.toHaveText('0/0');
});

test('decl6 detective starts and solves a clue', async ({ page }) => {
  await page.goto('/decl6-detective.html');
  await expect(page.locator('#decl6-canvas')).toBeVisible();
  await expect(page.locator('#decl6-start')).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.locator('#decl6-round')).toContainText(/1\s*\/\s*8/);

  const gameState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(gameState.mode).toBe('playing');
  expect(gameState.clue).toBeTruthy();

  const target = gameState.rooms.find((room) => room.scene === gameState.clue.scene);
  expect(target).toBeTruthy();

  const canvas = page.locator('#decl6-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box || !target) {
    return;
  }

  await canvas.click({
    position: {
      x: (target.x / gameState.canvas.width) * box.width,
      y: (target.y / gameState.canvas.height) * box.height,
    },
  });
  await page.keyboard.press('Enter');

  await expect(page.locator('#decl6-feedback')).toContainText(/Pavediens atrasts/);

  await page.evaluate((expectedAnswer) => {
    const option = Array.from(document.querySelectorAll('#decl6-options .decl6-option')).find(
      (button) => {
        const label = button.textContent?.replace(/^\d+\.\s*/, '').trim();
        return label === expectedAnswer;
      },
    );
    option?.click();
  }, gameState.clue.expectedAnswer);

  await expect(page.locator('#decl6-next')).toBeEnabled();
  await expect(page.locator('#decl6-solved')).toHaveText('1/8');

  await page.locator('#decl6-next').click();
  await expect(page.locator('#decl6-round')).toContainText(/2\s*\/\s*8/);
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
