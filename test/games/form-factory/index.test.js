import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

import {
  buildAnswerFromParts,
  buildChoices,
  createRoundDeck,
  getRequiredEnding,
  isCorrectAnswer,
  normalizeAnswer,
  normalizeItems,
} from '../../../src/games/form-factory/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const html = readFileSync(resolve(__dirname, '../../../form-factory.html'), 'utf8');

const item = {
  id: 'ff-test',
  lemma: 'lasīt',
  translation: 'to read',
  reflexive: false,
  stemHint: 'lasī-',
  subject: 'viņa',
  answer: 'lasīdama',
  distractors: ['lasīdams', 'lasīdamies', 'lasīdamās'],
  example: 'Viņa lasīja, lasīdama grāmatu.',
  explanation: 'Feminine singular.',
};

test('form factory page includes required controls', () => {
  assert.ok(html.includes('<title>Form Factory — Latvian B Level</title>'));
  [
    'ff-mode-choice',
    'ff-mode-build',
    'ff-score',
    'ff-streak',
    'ff-accuracy',
    'ff-progress',
    'ff-choices',
    'ff-answer-input',
    'ff-endings',
    'ff-feedback',
    'ff-next',
    'ff-restart',
    'ff-error',
  ].forEach((id) => {
    assert.ok(new RegExp(`id="${id}"`).test(html), `missing id ${id}`);
  });
});

test('getRequiredEnding selects non-reflexive singular and plural endings', () => {
  assert.equal(getRequiredEnding('viņš', false), '-dams');
  assert.equal(getRequiredEnding('viņa', false), '-dama');
  assert.equal(getRequiredEnding('viņi', false), '-dami');
  assert.equal(getRequiredEnding('viņas', false), '-damas');
});

test('getRequiredEnding distinguishes reflexive forms', () => {
  assert.equal(getRequiredEnding('viņš', true), '-damies');
  assert.equal(getRequiredEnding('Jānis', true), '-damies');
  assert.equal(getRequiredEnding('viņa', true), '-damās');
  assert.equal(getRequiredEnding('Anna', true), '-damās');
});

test('normalizeAnswer trims and lowercases while preserving Latvian diacritics', () => {
  assert.equal(normalizeAnswer('  LASĪDAMA  '), 'lasīdama');
  assert.notEqual(normalizeAnswer('lasidama'), normalizeAnswer('lasīdama'));
  assert.equal(isCorrectAnswer(' Lasīdama ', item), true);
  assert.equal(isCorrectAnswer('lasidama', item), false);
});

test('buildChoices includes the correct answer once', () => {
  const choices = buildChoices(item, () => 0.42);
  assert.equal(choices.length, 4);
  assert.equal(choices.filter((choice) => choice === item.answer).length, 1);
  assert.equal(new Set(choices.map(normalizeAnswer)).size, 4);
});

test('buildAnswerFromParts removes visual hyphen only at the boundary', () => {
  assert.equal(buildAnswerFromParts('lasī-', '-dams'), 'lasīdams');
  assert.equal(buildAnswerFromParts('mācī-', 'damās'), 'mācīdamās');
});

test('normalizeItems and createRoundDeck handle empty or malformed data', () => {
  const extensionItem = { ...item, id: 'ff-ext-test', subject: 'viņi', answer: 'lasīdami' };

  assert.deepEqual(normalizeItems(null), []);
  assert.deepEqual(normalizeItems({ items: [{ id: 'bad' }] }), []);
  assert.deepEqual(
    normalizeItems({ items: [item], extensionItems: [extensionItem] }).map((entry) => entry.id),
    ['ff-test', 'ff-ext-test'],
  );
  assert.deepEqual(createRoundDeck(null), []);
  assert.deepEqual(
    createRoundDeck([], () => 0.1),
    [],
  );
  assert.equal(createRoundDeck([item], () => 0.1, 4).length, 1);
});
