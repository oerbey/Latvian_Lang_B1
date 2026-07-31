import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  normalizeSentenceSurgeryDataset,
  normalizeSentenceSurgeryItem,
} from '../../../src/games/sentence-surgery-passive/data.js';

function makeItem(overrides = {}) {
  return {
    id: 'PV_TEST_1',
    topic: 'library',
    source: 'Test',
    target_lv: 'Grāmata tiek lasīta.',
    target_en: 'The book is being read.',
    broken_lv: 'Grāmata tika lasīta.',
    errors: [{ type: 'aux_tense', wrong: 'tika', correct: 'tiek' }],
    word_bank: ['tika', 'tiek', 'tiks', 'tiek', '.'],
    ...overrides,
  };
}

test('the complete runtime dataset satisfies the strict repair contract', () => {
  const raw = JSON.parse(
    readFileSync(
      new URL(
        '../../../sentence_surgery_pack/sentence_surgery_passive_dataset.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const dataset = normalizeSentenceSurgeryDataset(raw, 'runtime');

  assert.equal(dataset.items.length, 52);
  dataset.items.forEach((item) => {
    const brokenToken = item.brokenTokens[item.primaryEditableIndex];
    assert.equal(item.choices.includes(brokenToken), false);
    assert.ok(item.choices.includes(item.targetTokens[item.primaryEditableIndex]));
  });
});

test('normalization builds focused, deduplicated choices without the unchanged broken token', () => {
  const item = normalizeSentenceSurgeryItem(makeItem());

  assert.equal(item.primaryEditableIndex, 1);
  assert.deepEqual(item.editableIndices, [1]);
  assert.ok(item.choices.includes('tiek'));
  assert.ok(item.choices.includes('tiks'));
  assert.equal(item.choices.includes('tika'), false);
  assert.equal(new Set(item.choices).size, item.choices.length);
  assert.deepEqual(item.wordBank, item.choices);
});

test('participle choices stay focused on gender and number agreement', () => {
  const item = normalizeSentenceSurgeryItem(
    makeItem({
      target_lv: 'Grāmata tiek lasīta.',
      broken_lv: 'Grāmata tiek lasīts.',
      errors: [{ type: 'participle_agreement', wrong: 'lasīts', correct: 'lasīta' }],
      word_bank: ['Grāmata', 'tiek', 'lasīta', 'lasīts', '.'],
    }),
  );

  assert.deepEqual(item.choices, ['lasīta', 'lasīti', 'lasītas']);
  assert.equal(item.choices.includes('Grāmata'), false);
  assert.equal(item.choices.includes('tiek'), false);
});

test('dataset normalization rejects empty and duplicate IDs', () => {
  assert.throws(() => normalizeSentenceSurgeryItem(makeItem({ id: '  ' })), /non-empty id/);
  assert.throws(
    () =>
      normalizeSentenceSurgeryDataset({
        items: [makeItem(), makeItem()],
      }),
    /duplicate item id PV_TEST_1/,
  );
});

test('item normalization requires LV and EN sentence fields', () => {
  assert.throws(
    () => normalizeSentenceSurgeryItem(makeItem({ target_en: '' })),
    /target_lv, broken_lv, and target_en/,
  );
  assert.throws(
    () => normalizeSentenceSurgeryItem(makeItem({ target_lv: '' })),
    /target_lv, broken_lv, and target_en/,
  );
});

test('item normalization requires one declared error and one token replacement', () => {
  assert.throws(() => normalizeSentenceSurgeryItem(makeItem({ errors: [] })), /exactly one error/);
  assert.throws(
    () =>
      normalizeSentenceSurgeryItem(
        makeItem({
          broken_lv: 'Žurnāls tika lasīts.',
          errors: [{ type: 'aux_tense', wrong: 'tika', correct: 'tiek' }],
        }),
      ),
    /exactly one token replacement/,
  );
  assert.throws(
    () =>
      normalizeSentenceSurgeryItem(
        makeItem({
          broken_lv: 'Grāmata tiek lasīta.',
          errors: [{ type: 'aux_tense', wrong: 'tiek', correct: 'tiek' }],
        }),
      ),
    /exactly one token replacement/,
  );
});

test('declared error and correct word-bank option must match the sentence change', () => {
  assert.throws(
    () =>
      normalizeSentenceSurgeryItem(
        makeItem({
          errors: [{ type: 'aux_tense', wrong: 'tika', correct: 'tiks' }],
        }),
      ),
    /declared error does not match/,
  );
  assert.throws(
    () => normalizeSentenceSurgeryItem(makeItem({ word_bank: ['tika', 'tiks', '.'] })),
    /must include the correct target option/,
  );
});
