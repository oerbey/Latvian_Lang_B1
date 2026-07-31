import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

import {
  MAX_BOX,
  STAGES,
  applyResult,
  buildAdaptiveRound,
  buildExplanation,
  buildOptions,
  buildRuleOptions,
  buildStemGap,
  buildTask,
  calculateAccuracy,
  countDeckItems,
  createDeck,
  describeDeck,
  getAnswerEnding,
  getRequiredEnding,
  isCorrectAnswer,
  isCorrectTaskAnswer,
  makeCloze,
  normalizeAnswer,
  normalizeItems,
  normalizeRecords,
  stageForBox,
  xpForAnswer,
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
    'ffv3-live',
    'ffv3-xp',
    'ffv3-rounds',
    'ffv3-best-streak',
    'ffv3-due-count',
    'ffv3-learning-count',
    'ffv3-mastered-count',
    'ffv3-fresh-count',
    'ffv3-mastery-bar',
    'ffv3-deck-note',
    'ffv3-core-count',
    'ffv3-reflexive-count',
    'ffv3-all-count',
    'ffv3-reset',
    'ffv3-stage-label',
    'ffv3-progress',
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
    'ffv3-builder',
    'ffv3-build-stem',
    'ffv3-build-input',
    'ffv3-check',
    'ffv3-feedback',
    'ffv3-next',
    'ffv3-summary-score',
    'ffv3-summary-xp',
    'ffv3-summary-mastered',
    'ffv3-review',
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
  const endings = buildRuleOptions(item, () => 0.42);
  assert.equal(endings.length, 4);
  assert.ok(endings.includes('-dama'));
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
  assert.ok(right.startsWith('Viņa:'));
  assert.ok(right.includes('-dama'));
  const wrong = buildExplanation(item, false);
  assert.ok(wrong.includes(item.answer));
  assert.equal(xpForAnswer(STAGES.RULE, 0), 10);
  assert.equal(xpForAnswer(STAGES.BUILD, 5), 30);
});

test('form factory v3 advances records through rule, cloze, and build stages', () => {
  assert.equal(stageForBox(0), STAGES.RULE);
  assert.equal(stageForBox(1), STAGES.RULE);
  assert.equal(stageForBox(2), STAGES.CLOZE);
  assert.equal(stageForBox(3), STAGES.BUILD);

  let record = applyResult(undefined, true, 1_000);
  assert.equal(record.box, 1);
  record = applyResult(record, true, 2_000);
  assert.equal(record.box, 2);
  record = applyResult(record, true, 3_000);
  assert.equal(record.box, 3);
  record = applyResult(record, false, 4_000);
  assert.equal(record.box, 0);
  assert.equal(record.dueAt, 4_000);

  const repaired = normalizeRecords({
    good: { box: 2, dueAt: 50, seen: 3, correct: 2, wrong: 1 },
    clamped: { box: 99, dueAt: -1, seen: 'x', correct: 0, wrong: 2 },
  });
  assert.equal(repaired.good.box, 2);
  assert.equal(repaired.clamped.box, MAX_BOX);
  assert.equal(repaired.clamped.dueAt, 0);
});

test('form factory v3 builds the correct task shape for every adaptive stage', () => {
  const rule = buildTask(item, STAGES.RULE, () => 0.4);
  assert.equal(rule.answer, '-dama');
  assert.equal(rule.options.length, 4);
  assert.equal(isCorrectTaskAnswer('-dama', rule), true);

  const cloze = buildTask(item, STAGES.CLOZE, () => 0.4);
  assert.equal(cloze.answer, item.answer);
  assert.equal(cloze.cloze.before, 'Viņa sēdēja istabā,');
  assert.equal(cloze.options.length, 4);

  const build = buildTask(item, STAGES.BUILD, () => 0.4);
  assert.equal(build.answer, item.answer);
  assert.equal(build.stem, 'lasī');
  assert.equal(build.options, undefined);
});

test('form factory v3 adaptive rounds prioritize due forms and summarize mastery', () => {
  const items = normalizeItems({
    items: [
      item,
      { ...item, id: 'ffv3-b', subject: 'viņš', answer: 'lasīdams' },
      { ...item, id: 'ffv3-c', subject: 'Anna', answer: 'lasīdama' },
      { ...item, id: 'ffv3-d', subject: 'viņi', answer: 'lasīdami' },
      { ...item, id: 'ffv3-e', subject: 'viņas', answer: 'lasīdamas' },
    ],
  });
  const now = 10_000;
  const records = {
    'ffv3-b': { box: 2, dueAt: now - 100, seen: 2, correct: 2, wrong: 0 },
    'ffv3-c': { box: MAX_BOX, dueAt: now + 5_000, seen: 5, correct: 5, wrong: 0 },
  };
  const round = buildAdaptiveRound(items, records, {
    size: 4,
    maxNew: 2,
    now,
    rng: () => 0.4,
  });
  assert.equal(round[0].id, 'ffv3-b');
  assert.equal(round.filter((entry) => !records[entry.id]).length, 2);

  const summary = describeDeck(items, records, { now });
  assert.deepEqual(summary, { total: 5, fresh: 3, learning: 1, due: 1, mastered: 1 });
});
