import { test, expect } from '@playwright/test';

const homepagePreviewCards = [
  { title: 'Darbības Vārdi', preview: 'verbs_preview.png', href: 'darbibas-vards.html' },
  {
    title: 'Darbības Vārdi V2',
    preview: 'verbs_preview.png',
    href: 'darbibas-vardi-v2.html',
  },
  {
    title: 'Nākt ar priedēkļiem',
    preview: 'verbs_preview.png',
    href: 'prefixed-coming-verbs.html',
  },
  {
    title: 'Līdzīgo formu treniņš',
    preview: 'verbs_preview.png',
    href: 'similar-word-groups.html',
  },
  { title: 'Conjugation Sprint', preview: 'sprint_preview.png', href: 'conjugation-sprint.html' },
  { title: 'Endings Builder', preview: 'endings_preview.png', href: 'endings-builder.html' },
  { title: 'Form Factory', preview: 'endings_preview.png', href: 'form-factory.html' },
  { title: 'Form Factory v2', preview: 'endings_preview.png', href: 'form-factory-v2.html' },
  { title: 'Form Factory v3', preview: 'endings_preview.png', href: 'form-factory-v3.html' },
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

test('endings builder opens its focused trainer and accepts an ending', async ({ page }) => {
  await page.goto('/endings-builder.html');
  await expect(page.locator('[data-eb-heading]')).toBeVisible();
  await expect(page.locator('[data-eb-screen="start"]')).toBeVisible();
  await expect(page.locator('[data-eb-total]')).not.toHaveText('0');

  const howTo = page.locator('.eb-howto');
  await expect(howTo).toBeVisible();
  await howTo.locator('summary').click();
  await expect(howTo).toHaveAttribute('open', '');
  await expect(howTo).toContainText('Latviski');
  await expect(howTo).toContainText('English');

  await page.locator('[data-eb-start]').click();
  await expect(page.locator('[data-eb-screen="play"]')).toBeVisible();
  await expect(page.locator('[data-eb-round-brief]')).toContainText(/Raunds|Round/);
  await expect(page.locator('#ebBoard .eb-slot')).toBeVisible();
  await expect(page.locator('#ebOptions .eb-ending').first()).toBeVisible();
  await expect(page.locator('.eb-shell')).toBeVisible();
  await expect(page.getByRole('button', { name: /Izlaist|Skip/ })).toBeVisible();

  const actionBarBox = await page.locator('.eb-shell__controls').boundingBox();
  const viewport = page.viewportSize();
  expect(actionBarBox).not.toBeNull();
  expect(actionBarBox.y).toBeGreaterThanOrEqual(0);
  expect(actionBarBox.y + actionBarBox.height).toBeLessThanOrEqual(viewport.height + 1);

  const hits = page.locator('.eb-shell__stat[data-value="hits"] .eb-shell__value');
  const slot = page.locator('#ebBoard .eb-slot');
  const gameState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const wrongEnding = gameState.endings.find((ending) => ending !== gameState.answer);
  await expect(hits).toHaveText('0/0');
  await page.locator('#ebOptions .eb-ending').getByText(wrongEnding, { exact: true }).click();
  await expect(hits).toHaveText('0/1');
  await expect(page.locator('.eb-feedback')).toContainText(/Nepareizi|Wrong/);

  await page.locator('#ebOptions .eb-ending').getByText(gameState.answer, { exact: true }).click();
  await expect(slot).toHaveClass(/has-ending/);
  await expect(slot).toHaveClass(/is-correct/);
  await expect(slot).not.toHaveClass(/is-wrong/);
  await expect(hits).toHaveText('1/2');
  await expect(page.locator('[data-eb-explain]')).toBeVisible();
});

test('form factory loads data and checks choice and build modes', async ({ page }) => {
  await page.goto('/form-factory.html');

  await expect(page.getByRole('heading', { name: 'Form Factory' })).toBeVisible();
  await expect(page.locator('#ff-lemma')).not.toHaveText('—');
  await expect(page.locator('#ff-choices button')).toHaveCount(4);

  const initialState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page
    .locator('#ff-choices')
    .getByRole('button', { name: initialState.prompt.answer, exact: true })
    .click();
  await expect(page.locator('#ff-feedback')).toContainText('Pareizi!');
  await expect(page.locator('#ff-score')).toHaveText('1');

  await page.locator('#ff-next').click();
  await page.locator('label[for="ff-mode-build"]').click();
  const buildState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const ending = buildState.prompt.answer.match(/dam(?:ies|ās|as|a|i|s)$/)?.[0] || '';
  await page
    .locator('#ff-endings')
    .getByRole('button', { name: `-${ending}`, exact: true })
    .click();
  await page.locator('#ff-check-build').click();
  await expect(page.locator('#ff-feedback')).toContainText('Pareizi!');
});

test('form factory v2 starts a cloze round and checks an answer', async ({ page }) => {
  await page.goto('/form-factory-v2.html');

  await expect(page.getByRole('heading', { name: 'Form Factory v2' })).toBeVisible();
  await page.getByRole('button', { name: /Pamata raunds/ }).click();

  await expect(page.locator('#ffv2-progress-text')).toHaveText(/1\/\d+/);
  await expect(page.locator('#ffv2-options button')).toHaveCount(4);

  const gameState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page
    .locator('#ffv2-options')
    .getByRole('button', { name: gameState.prompt.answer, exact: true })
    .click();

  await expect(page.locator('#ffv2-feedback')).toContainText('Pareizi!');
  await expect(page.locator('#ffv2-score')).toHaveText('1');
  await expect(page.locator('#ffv2-cloze-gap')).toHaveText(gameState.prompt.answer);
});

test('form factory v3 starts a tap-first round and checks an answer', async ({ page }) => {
  await page.goto('/form-factory-v3.html');

  await expect(page.getByRole('heading', { name: 'Form Factory v3' })).toBeVisible();
  await page.getByRole('button', { name: /Pamata/ }).click();

  await expect(page.locator('#ffv3-stage-label')).toHaveText('Likums');
  await expect(page.locator('#ffv3-progress-text')).toHaveText(/0\/\d+/);
  await expect(page.locator('#ffv3-options button')).toHaveCount(4);

  const gameState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page
    .locator('#ffv3-options')
    .getByRole('button', { name: gameState.prompt.answer, exact: true })
    .click();

  await expect(page.locator('#ffv3-feedback')).toContainText('Pareizi!');
  await expect(page.locator('#ffv3-score')).toHaveText('10');
  await expect(page.locator('#ffv3-progress-text')).toHaveText(/1\/\d+/);

  await page.keyboard.press('Enter');
  await expect(page.locator('#ffv3-progress-text')).toHaveText(/1\/\d+/);
  await expect(page.locator('#ffv3-feedback')).toBeHidden();
});

test('form factory v3 keeps the adaptive dark desktop card readable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/form-factory-v3.html');

  await expect(page.getByRole('heading', { name: 'Form Factory v3' })).toBeVisible();
  if ((await page.locator('html').getAttribute('data-bs-theme')) !== 'dark') {
    await page.locator('#theme-toggle').click();
  }
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  await page.getByRole('button', { name: /Pamata/ }).click();

  const layout = await page.evaluate(() => {
    const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (value) => {
      const channels = rgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const contrast = (foreground, background) => {
      const lighter = Math.max(luminance(foreground), luminance(background));
      const darker = Math.min(luminance(foreground), luminance(background));
      return (lighter + 0.05) / (darker + 0.05);
    };
    const pairContrast = (foregroundSelector, backgroundSelector) => {
      const foreground = getComputedStyle(document.querySelector(foregroundSelector)).color;
      const background = getComputedStyle(
        document.querySelector(backgroundSelector),
      ).backgroundColor;
      return contrast(foreground, background);
    };
    return {
      promptContrast: pairContrast('.ffv3-prompt', '.ffv3-card'),
      mutedContrast: pairContrast('.ffv3-prompt-label', '.ffv3-card'),
      optionContrast: pairContrast('.ffv3-option__text', '.ffv3-option'),
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  expect(layout.promptContrast).toBeGreaterThanOrEqual(4.5);
  expect(layout.mutedContrast).toBeGreaterThanOrEqual(4.5);
  expect(layout.optionContrast).toBeGreaterThanOrEqual(4.5);
  expect(layout.hasHorizontalOverflow).toBe(false);

  const gameState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page
    .locator('#ffv3-options')
    .getByRole('button', { name: gameState.prompt.answer, exact: true })
    .click();
  await expect(page.locator('#ffv3-feedback')).toBeVisible();
  const feedbackIsInViewport = await page.locator('#ffv3-feedback').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight + 1;
  });
  expect(feedbackIsInViewport).toBe(true);
});

test('form factory v3 build stage requires a typed full form', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'llb1:progress',
      JSON.stringify({
        schemaVersion: 1,
        legacyMigrated: true,
        games: {
          'form-factory-v3': {
            updatedAt: null,
            data: {
              deckId: 'core',
              records: {
                'ff-001': { box: 3, dueAt: 0, seen: 3, correct: 3, wrong: 0 },
              },
            },
          },
        },
      }),
    );
  });
  await page.goto('/form-factory-v3.html');
  await page.getByRole('button', { name: /Pamata/ }).click();

  const gameState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(gameState.prompt.stage).toBe('build');
  await expect(page.locator('#ffv3-builder')).toBeVisible();
  await expect(page.locator('#ffv3-options')).toBeHidden();
  await page.locator('#ffv3-build-input').fill(gameState.prompt.answer);
  await page.locator('#ffv3-check').click();
  await expect(page.locator('#ffv3-feedback')).toContainText('Pareizi!');
  await expect(page.locator('#ffv3-score')).toHaveText('20');
});

test('form factory v3 cloze stage uses the full form in sentence context', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'llb1:progress',
      JSON.stringify({
        schemaVersion: 1,
        legacyMigrated: true,
        games: {
          'form-factory-v3': {
            updatedAt: null,
            data: {
              deckId: 'core',
              records: {
                'ff-001': { box: 2, dueAt: 0, seen: 2, correct: 2, wrong: 0 },
              },
            },
          },
        },
      }),
    );
  });
  await page.goto('/form-factory-v3.html');
  await page.getByRole('button', { name: /Pamata/ }).click();

  const gameState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(gameState.prompt.stage).toBe('cloze');
  await expect(page.locator('#ffv3-cloze')).toBeVisible();
  await expect(page.locator('#ffv3-options button')).toHaveCount(4);
  await page
    .locator('#ffv3-options')
    .getByRole('button', { name: gameState.prompt.answer, exact: true })
    .click();
  await expect(page.locator('#ffv3-cloze-gap')).toHaveText(gameState.prompt.answer);
  await expect(page.locator('#ffv3-score')).toHaveText('15');
});

test('form factory v3 adaptive flow fits a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/form-factory-v3.html');

  const startOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(startOverflow).toBe(false);
  await expect(page.locator('#ffv3-due-count')).toBeVisible();
  await page.getByRole('button', { name: /Pamata/ }).click();
  await expect(page.locator('.ffv3-card')).toBeVisible();
  await expect(page.locator('#ffv3-options button')).toHaveCount(4);

  const gameState = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page
    .locator('#ffv3-options')
    .getByRole('button', { name: gameState.prompt.answer, exact: true })
    .click();
  await expect(page.locator('#ffv3-feedback')).toBeVisible();
  await expect(page.locator('#ffv3-next')).toBeInViewport();
  const playOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(playOverflow).toBe(false);
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

test('sentence surgery supports an exact-target keyboard repair flow', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'llb1:app-state',
      JSON.stringify({ schemaVersion: 1, theme: 'light', language: 'en' }),
    );
  });
  await page.goto('/sentence-surgery-passive.html');

  await expect(page.locator('#sspv-sentence')).toBeVisible();
  await expect(page.locator('#sspv-sentence [data-repair-slot]')).toHaveCount(1);
  await expect(page.locator('#sspv-sentence button')).toHaveCount(0);
  await expect(page.locator('#sspv-choices button').first()).toBeVisible();
  await expect(page.locator('#sspv-translation')).toBeHidden();
  await expect(page.locator('#sspv-next')).toBeHidden();
  await expect(page.locator('#sspv-live[aria-live]')).toHaveCount(1);

  const initial = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const wrongIndex = initial.round.choices.findIndex(
    (choice) => choice.token !== initial.round.targetToken,
  );
  const correctIndex = initial.round.choices.findIndex(
    (choice) => choice.token === initial.round.targetToken,
  );
  expect(wrongIndex).toBeGreaterThanOrEqual(0);
  expect(correctIndex).toBeGreaterThanOrEqual(0);

  const choices = page.locator('#sspv-choices button');
  await choices.nth(wrongIndex).focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())))
    .toMatchObject({
      mode: 'playing',
      progress: { attempts: initial.progress.attempts + 1 },
      round: { translationVisible: true, solved: false },
    });
  await expect(choices.nth(wrongIndex)).toHaveAttribute('data-state', 'wrong');
  await expect(page.locator('#sspv-feedback')).toHaveAttribute('data-tone', 'error');
  await expect(page.locator('#sspv-translation')).toBeVisible();
  await expect(page.locator('#sspv-translation')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#sspv-next')).toBeHidden();

  await choices.nth(correctIndex).focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())))
    .toMatchObject({
      mode: 'solved',
      progress: { attempts: initial.progress.attempts + 2, correct: initial.progress.correct + 1 },
      round: { solved: true },
    });
  await expect(choices.nth(correctIndex)).toHaveAttribute('data-state', 'correct');
  await expect(page.locator('#sspv-sentence [data-repair-slot]')).toHaveText(
    initial.round.targetToken,
  );
  await expect(page.locator('#sspv-next')).toBeVisible();
  await expect(page.locator('#sspv-next')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect
    .poll(
      async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())).round.number,
    )
    .toBe(2);
  await expect(page.locator('#sspv-promptTitle')).toBeFocused();
});

test('sentence surgery settings persist language and support review and reset', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'llb1:app-state',
      JSON.stringify({ schemaVersion: 1, theme: 'light', language: 'en' }),
    );
  });
  await page.goto('/sentence-surgery-passive.html');

  const firstRound = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const firstCorrectIndex = firstRound.round.choices.findIndex(
    (choice) => choice.token === firstRound.round.targetToken,
  );
  await page.locator('#sspv-choices button').nth(firstCorrectIndex).click();
  await expect(page.locator('#sspv-next')).toBeVisible();

  await page.locator('#sspv-settingsOpen').click();
  await expect(page.locator('#sspv-settingsDialog')).toBeVisible();
  await page.locator('#sspv-language').selectOption('ru');
  await page.locator('#sspv-mode').selectOption('sequential');
  await page.locator('#sspv-applySettings').click();
  await expect
    .poll(async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())))
    .toMatchObject({ language: 'ru', order: 'sequential', reviewMode: false });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  const storedLanguage = await page.evaluate(
    () => JSON.parse(localStorage.getItem('llb1:app-state')).language,
  );
  expect(storedLanguage).toBe('ru');

  await page.locator('#sspv-settingsOpen').click();
  await expect(page.locator('#sspv-reviewCompleted')).toBeEnabled();
  await page.locator('#sspv-reviewCompleted').click();
  await expect
    .poll(async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())))
    .toMatchObject({
      reviewMode: true,
      round: { id: firstRound.round.id },
      progress: { completed: 1 },
    });

  const reviewRound = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const reviewCorrectIndex = reviewRound.round.choices.findIndex(
    (choice) => choice.token === reviewRound.round.targetToken,
  );
  await page.locator('#sspv-choices button').nth(reviewCorrectIndex).click();
  await page.locator('#sspv-next').click();
  await expect(page.locator('#sspv-complete')).toBeVisible();
  await page.locator('#sspv-practiceAgain').click();
  await expect
    .poll(async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())))
    .toMatchObject({ reviewMode: true, round: { id: firstRound.round.id } });

  await page.locator('#sspv-settingsOpen').click();
  let resetPrompt = '';
  page.once('dialog', async (dialog) => {
    resetPrompt = dialog.message();
    await dialog.accept();
  });
  await page.locator('#sspv-resetProgress').click();
  await expect
    .poll(async () => JSON.parse(await page.evaluate(() => window.render_game_to_text())).progress)
    .toMatchObject({ completed: 0, attempts: 0, correct: 0, streak: 0 });
  expect(resetPrompt.length).toBeGreaterThan(0);
});

test('sentence surgery fits mobile and desktop themes with reduced motion', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'llb1:app-state',
      JSON.stringify({ schemaVersion: 1, theme: 'light', language: 'en' }),
    );
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 667 });
    await page.goto('/sentence-surgery-passive.html');
    await expect(page.locator('#sspv-choices button').first()).toBeVisible();
    const mobileLayout = await page.evaluate(() => {
      const sentence = document.querySelector('#sspv-sentence').getBoundingClientRect();
      const firstChoice = document.querySelector('#sspv-choices button').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        sentenceTop: sentence.top,
        firstChoiceBottom: firstChoice.bottom,
        firstChoiceHeight: firstChoice.height,
      };
    });
    expect(mobileLayout.overflow).toBe(false);
    expect(mobileLayout.sentenceTop).toBeGreaterThanOrEqual(0);
    expect(mobileLayout.firstChoiceBottom).toBeLessThanOrEqual(667);
    expect(mobileLayout.firstChoiceHeight).toBeGreaterThanOrEqual(44);

    if (width === 375) {
      const mobileRound = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
      const correctIndex = mobileRound.round.choices.findIndex(
        (choice) => choice.token === mobileRound.round.targetToken,
      );
      await page.locator('#sspv-choices button').nth(correctIndex).click();
      await expect(page.locator('#sspv-next')).toBeVisible();
      await page
        .locator('#sspv-next')
        .evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await expect(page.locator('#sspv-next')).toBeInViewport();
      const solvedLayout = await page.evaluate(() => {
        const feedback = document.querySelector('#sspv-feedback').getBoundingClientRect();
        const next = document.querySelector('#sspv-next').getBoundingClientRect();
        return {
          documentCanScroll: document.documentElement.scrollHeight > window.innerHeight,
          feedbackGap: next.top - feedback.bottom,
        };
      });
      expect(solvedLayout.documentCanScroll).toBe(true);
      expect(solvedLayout.feedbackGap).toBeLessThanOrEqual(20);
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/sentence-surgery-passive.html');
  const desktopLayout = await page.evaluate(() => {
    const round = document.querySelector('#sspv-round').getBoundingClientRect();
    return {
      width: round.width,
      centered: Math.abs(round.left + round.width / 2 - window.innerWidth / 2),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(desktopLayout.width).toBeLessThanOrEqual(820);
  expect(desktopLayout.centered).toBeLessThanOrEqual(2);
  expect(desktopLayout.overflow).toBe(false);

  for (const theme of ['light', 'dark']) {
    await page.evaluate((nextTheme) => {
      document.documentElement.setAttribute('data-theme', nextTheme);
      document.documentElement.setAttribute('data-bs-theme', nextTheme);
    }, theme);
    await page.waitForTimeout(50);
    const contrast = await page.evaluate(() => {
      const toRgb = (value) => {
        const channels = (value.match(/[\d.]+/gu) || []).map(Number);
        return value.startsWith('color(srgb')
          ? channels.slice(0, 3).map((channel) => channel * 255)
          : channels.slice(0, 3);
      };
      const luminance = (value) => {
        const channels = toRgb(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const ratio = (foreground, background) => {
        const lighter = Math.max(luminance(foreground), luminance(background));
        const darker = Math.min(luminance(foreground), luminance(background));
        return (lighter + 0.05) / (darker + 0.05);
      };
      const pair = (foregroundSelector, backgroundSelector) =>
        ratio(
          getComputedStyle(document.querySelector(foregroundSelector)).color,
          getComputedStyle(document.querySelector(backgroundSelector)).backgroundColor,
        );
      return {
        sentence: pair('#sspv-sentence', '#sspv-round'),
        repairSlot: pair('[data-repair-slot]', '[data-repair-slot]'),
        choice: pair('.sspv-choice__label', '.sspv-choice'),
      };
    });
    expect(contrast.sentence).toBeGreaterThanOrEqual(4.5);
    expect(contrast.repairSlot).toBeGreaterThanOrEqual(4.5);
    expect(contrast.choice).toBeGreaterThanOrEqual(4.5);
  }

  const current = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const correctIndex = current.round.choices.findIndex(
    (choice) => choice.token === current.round.targetToken,
  );
  await page.locator('#sspv-choices button').nth(correctIndex).click();
  await expect(page.locator('#sspv-feedback')).toBeVisible();
  await expect(page.locator('#sspv-next')).toBeVisible();
  const reducedMotion = await page.locator('#sspv-round').evaluate((element) => {
    const duration = getComputedStyle(element).animationDuration.trim();
    return duration.endsWith('ms')
      ? Number.parseFloat(duration)
      : Number.parseFloat(duration) * 1000;
  });
  expect(reducedMotion).toBeLessThanOrEqual(0.1);
  const feedbackGap = await page.evaluate(() => {
    const feedback = document.querySelector('#sspv-feedback').getBoundingClientRect();
    const next = document.querySelector('#sspv-next').getBoundingClientRect();
    return next.top - feedback.bottom;
  });
  expect(feedbackGap).toBeLessThanOrEqual(20);
});
