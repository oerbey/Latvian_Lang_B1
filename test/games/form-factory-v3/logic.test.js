import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

import {
  buildExplanation,
  buildOptions,
  buildStemGap,
  calculateAccuracy,
  countDeckItems,
  createDeck,
  getAnswerEnding,
  getRequiredEnding,
  isCorrectAnswer,
  makeCloze,
  normalizeAnswer,
  normalizeItems,
} from '../../../src/games/form-factory-v3/logic.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const html = readFileSync(resolve(__dirname, '../../../form-factory-v3.html'), 'utf8');
const homepageScript = readFileSync(resolve(__dirname, '../../../scripts/homepage.js'), 'utf8');
const navConfig = readFileSync(resolve(__dirname, '../../../scripts/nav-config.js'), 'utf8');
const serviceWorker = readFileSync(resolve(__dirname, '../../../sw.js'), 'utf8');

const item = {
  id: 'ffv3-test',
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

test('form factory v3 page includes required elements', () => {
  assert.ok(html.includes('<title>Form Factory v3 — Latvian B Level</title>'));
  [
    'ffv3-error',
    'ffv3-best-line',
    'ffv3-rounds-line',
    'ffv3-core-count',
    'ffv3-reflexive-count',
    'ffv3-all-count',
    'ffv3-progress-bar',
    'ffv3-progress-text',
    'ffv3-score',
    'ffv3-streak',
    'ffv3-subject',
    'ffv3-verb',
    'ffv3-type',
    'ffv3-cloze-before',
    'ffv3-cloze-gap',
    'ffv3-cloze-after',
    'ffv3-options',
    'ffv3-feedback',
    'ffv3-next',
    'ffv3-summary-score',
    'ffv3-replay',
    'ffv3-change-deck',
  ].forEach((id) => {
    assert.ok(new RegExp(`id="${id}"`).test(html), `missing id ${id}`);
  });
  ['data-screen="start"', 'data-screen="play"', 'data-screen="summary"'].forEach((marker) => {
    assert.ok(html.includes(marker), `missing ${marker}`);
  });
});

test('form factory v3 is registered in navigation, homepage, and offline cache', () => {
  assert.ok(navConfig.includes("{ href: 'form-factory-v3.html', label: 'Form Factory v3' }"));
  assert.ok(homepageScript.includes("title: 'Form Factory v3'"));
  assert.ok(homepageScript.includes("href: 'form-factory-v3.html'"));
  [
    './form-factory-v3.html',
    './src/games/form-factory-v3/index.js',
    './src/games/form-factory-v3/logic.js',
    './src/games/form-factory-v3/styles.css',
    './data/form-factory/items.json',
  ].forEach((asset) => {
    assert.ok(serviceWorker.includes(asset), `missing offline asset ${asset}`);
  });
});

test('form factory v3 endings cover singular, plural, and reflexive forms', () => {
  assert.equal(getRequiredEnding('viņš', false), '-dams');
  assert.equal(getRequiredEnding('viņa', false), '-dama');
  assert.equal(getRequiredEnding('viņi', false), '-dami');
  assert.equal(getRequiredEnding('viņas', false), '-damas');
  assert.equal(getRequiredEnding('Jānis', true), '-damies');
  assert.equal(getRequiredEnding('Anna', true), '-damās');
});

test('form factory v3 normalizes and checks answers with Latvian diacritics', () => {
  assert.equal(normalizeAnswer('  LASĪDAMA  '), 'lasīdama');
  assert.equal(isCorrectAnswer(' Lasīdama ', item), true);
  assert.equal(isCorrectAnswer('lasidama', item), false);
});

test('form factory v3 builds cloze text and stem gaps', () => {
  const cloze = makeCloze(item);
  assert.equal(cloze.before, 'Viņa sēdēja istabā,');
  assert.equal(cloze.after, 'grāmatu.');
  assert.equal(buildStemGap(item), 'lasī___');
});

test('form factory v3 creates answer options and ending labels', () => {
  const options = buildOptions(item, () => 0.42);
  assert.equal(options.length, 4);
  assert.equal(options.filter((option) => option === item.answer).length, 1);
  assert.equal(new Set(options.map(normalizeAnswer)).size, 4);
  assert.equal(getAnswerEnding('lasīdamies'), '-damies');
  assert.equal(getAnswerEnding('lasīdama'), '-dama');
});

test('form factory v3 filters deck counts and caps round size', () => {
  const items = normalizeItems({
    items: [
      item,
      { ...item, id: 'ffv3-b', level: 2, subject: 'viņš', answer: 'lasīdams' },
      { ...item, id: 'ffv3-c', level: 4, subject: 'viņi', answer: 'lasīdami' },
    ],
    extensionItems: [
      {
        ...item,
        id: 'ffv3-r',
        level: 3,
        reflexive: true,
        subject: 'Anna',
        answer: 'lasīdamās',
      },
    ],
  });
  assert.equal(countDeckItems(items, 'core'), 3);
  assert.equal(countDeckItems(items, 'reflexive'), 1);
  assert.equal(countDeckItems(items, 'all'), 4);
  assert.equal(createDeck(items, { deckId: 'all', size: 2 }).length, 2);
  assert.deepEqual(createDeck([], {}), []);
});

test('form factory v3 calculates accuracy and explains answers', () => {
  assert.equal(calculateAccuracy(0, 0), 0);
  assert.equal(calculateAccuracy(3, 4), 75);
  const right = buildExplanation(item, true);
  assert.ok(right.startsWith('Pareizi!'));
  assert.ok(right.includes('-dama'));
  const wrong = buildExplanation(item, false);
  assert.ok(wrong.includes(item.answer));
});
