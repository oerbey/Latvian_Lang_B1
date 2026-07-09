import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

import {
  buildExplanation,
  buildOptions,
  calculateAccuracy,
  createDeck,
  getRequiredEnding,
  isCorrectAnswer,
  makeCloze,
  normalizeAnswer,
  normalizeItems,
} from '../../../src/games/form-factory-v2/logic.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const html = readFileSync(resolve(__dirname, '../../../form-factory-v2.html'), 'utf8');
const homepageScript = readFileSync(resolve(__dirname, '../../../scripts/homepage.js'), 'utf8');
const navConfig = readFileSync(resolve(__dirname, '../../../scripts/nav-config.js'), 'utf8');
const serviceWorker = readFileSync(resolve(__dirname, '../../../sw.js'), 'utf8');

const item = {
  id: 'ffv2-test',
  level: 1,
  lemma: 'lasīt',
  translation: 'to read',
  reflexive: false,
  stemHint: 'lasī-',
  subject: 'viņa',
  answer: 'lasīdama',
  distractors: ['lasīdams', 'lasīdamies', 'lasīdamās'],
  example: 'Viņa sēdēja istabā, lasīdama grāmatu.',
  explanation: 'Feminine singular.',
};

test('form factory v2 page includes required elements', () => {
  assert.ok(html.includes('<title>Form Factory v2 — Latvian B Level</title>'));
  [
    'ffv2-error',
    'ffv2-start-best',
    'ffv2-progress-bar',
    'ffv2-progress-text',
    'ffv2-streak',
    'ffv2-score',
    'ffv2-subject-chip',
    'ffv2-verb-chip',
    'ffv2-reflex-chip',
    'ffv2-cloze-before',
    'ffv2-cloze-gap',
    'ffv2-cloze-after',
    'ffv2-options',
    'ffv2-feedback',
    'ffv2-next',
    'ffv2-quit',
    'ffv2-summary-score',
    'ffv2-replay',
    'ffv2-change-deck',
  ].forEach((id) => {
    assert.ok(new RegExp(`id="${id}"`).test(html), `missing id ${id}`);
  });
  ['data-screen="start"', 'data-screen="play"', 'data-screen="summary"'].forEach((marker) => {
    assert.ok(html.includes(marker), `missing ${marker}`);
  });
});

test('form factory v2 is registered in navigation, homepage, and offline cache', () => {
  assert.ok(navConfig.includes("{ href: 'form-factory-v2.html', label: 'Form Factory v2' }"));
  assert.ok(homepageScript.includes("title: 'Form Factory v2'"));
  assert.ok(homepageScript.includes("href: 'form-factory-v2.html'"));
  [
    './form-factory-v2.html',
    './src/games/form-factory-v2/index.js',
    './src/games/form-factory-v2/logic.js',
    './src/games/form-factory-v2/styles.css',
    './data/form-factory/items.json',
  ].forEach((asset) => {
    assert.ok(serviceWorker.includes(asset), `missing offline asset ${asset}`);
  });
});

test('getRequiredEnding covers singular, plural, and reflexive forms', () => {
  assert.equal(getRequiredEnding('viņš', false), '-dams');
  assert.equal(getRequiredEnding('viņa', false), '-dama');
  assert.equal(getRequiredEnding('viņi', false), '-dami');
  assert.equal(getRequiredEnding('viņas', false), '-damas');
  assert.equal(getRequiredEnding('Jānis', true), '-damies');
  assert.equal(getRequiredEnding('Anna', true), '-damās');
});

test('normalizeAnswer preserves Latvian diacritics', () => {
  assert.equal(normalizeAnswer('  LASĪDAMA  '), 'lasīdama');
  assert.equal(isCorrectAnswer(' Lasīdama ', item), true);
  assert.equal(isCorrectAnswer('lasidama', item), false);
});

test('makeCloze splits the example around the answer', () => {
  const cloze = makeCloze(item);
  assert.equal(cloze.before, 'Viņa sēdēja istabā,');
  assert.equal(cloze.after, 'grāmatu.');
});

test('makeCloze falls back when answer missing from example', () => {
  const cloze = makeCloze({ ...item, example: 'Teikums bez atbildes vārda.' });
  assert.equal(cloze.before, null);
  assert.equal(cloze.after, null);
});

test('buildOptions returns four unique options including the answer', () => {
  const options = buildOptions(item, () => 0.42);
  assert.equal(options.length, 4);
  assert.equal(options.filter((option) => option === item.answer).length, 1);
  assert.equal(new Set(options.map(normalizeAnswer)).size, 4);
});

test('normalizeItems merges items and extensionItems and drops invalid entries', () => {
  const payload = {
    items: [item, { id: 'broken' }],
    extensionItems: [{ ...item, id: 'ffv2-ext', level: 4, subject: 'viņas', answer: 'lasīdamas' }],
  };
  const items = normalizeItems(payload);
  assert.equal(items.length, 2);
  assert.equal(items[1].level, 4);
});

test('createDeck filters by level and caps the size', () => {
  const items = normalizeItems({
    items: [item, { ...item, id: 'ffv2-b', level: 3 }],
    extensionItems: [{ ...item, id: 'ffv2-ext', level: 4 }],
  });
  assert.equal(createDeck(items, { levelFilter: 'core' }).length, 2);
  assert.equal(createDeck(items, { levelFilter: 'plural' }).length, 1);
  assert.equal(createDeck(items, { levelFilter: 'all', size: 2 }).length, 2);
  assert.deepEqual(createDeck([], {}), []);
});

test('calculateAccuracy handles zero answers', () => {
  assert.equal(calculateAccuracy(0, 0), 0);
  assert.equal(calculateAccuracy(3, 4), 75);
});

test('buildExplanation reports the required ending in Latvian', () => {
  const right = buildExplanation(item, true);
  assert.ok(right.startsWith('Pareizi!'));
  assert.ok(right.includes('-dama'));
  const wrong = buildExplanation(item, false);
  assert.ok(wrong.includes(item.answer));
});
