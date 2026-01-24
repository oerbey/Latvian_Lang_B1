import { test, expect } from '@playwright/test';

test('homepage loads and lists games', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Latvian Language B1 Games' })).toBeVisible();
  const cards = page.locator('#gamesGrid .card');
  await expect(cards.first()).toBeVisible();
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
