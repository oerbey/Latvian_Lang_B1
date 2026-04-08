import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPreserveTokenSet,
  findMismatchIndices,
  joinTokens,
  tokenizeSentence,
} from '../../../src/games/sentence-surgery-passive/tokenize.js';

test('tokenizeSentence keeps punctuation as standalone tokens', () => {
  const preserve = createPreserveTokenSet(['Grāmata', 'tiek', 'lasīta', '.']);
  const tokens = tokenizeSentence('Grāmata tiek lasīta.', preserve);
  assert.deepEqual(tokens, ['Grāmata', 'tiek', 'lasīta', '.']);
});

test('tokenizeSentence preserves dot-abbreviations and decimal-like tokens from word bank', () => {
  const preserve = createPreserveTokenSet(['plkst.', '8.00', '.']);
  const tokens = tokenizeSentence('Veikals tiek atvērts plkst. 8.00.', preserve);
  assert.deepEqual(tokens, ['Veikals', 'tiek', 'atvērts', 'plkst.', '8.00', '.']);
});

test('joinTokens enforces punctuation spacing rules', () => {
  const text = joinTokens(['Vai', 'durvis', 'netiek', 'slēgtas', '?']);
  assert.equal(text, 'Vai durvis netiek slēgtas?');
});

test('findMismatchIndices returns all mismatch positions', () => {
  const mismatches = findMismatchIndices(
    ['Durvis', 'tika', 'slēgtas', '.'],
    ['Durvis', 'tiek', 'slēgtas', '.'],
  );
  assert.deepEqual(mismatches, [1]);
});
