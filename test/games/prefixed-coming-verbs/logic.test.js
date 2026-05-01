import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatSentenceFromChunks,
  matchesExactAnswer,
  shuffleChunks,
} from '../../../src/games/prefixed-coming-verbs/logic.js';

describe('prefixed-coming-verbs logic', () => {
  it('formats sentence builder chunks without spaces before punctuation', () => {
    assert.equal(
      formatSentenceFromChunks(['Kad', 'tu', 'pārnāksi', 'mājās', '?']),
      'Kad tu pārnāksi mājās?',
    );
    assert.equal(
      formatSentenceFromChunks(['Mums', 'nāksies', 'meklēt', 'citu', 'risinājumu', '.']),
      'Mums nāksies meklēt citu risinājumu.',
    );
  });

  it('accepts the requested sentence builder answers exactly', () => {
    assert.equal(matchesExactAnswer('Kad tu pārnāksi mājās?', 'Kad tu pārnāksi mājās?'), true);
    assert.equal(
      matchesExactAnswer(
        'Mums nāksies meklēt citu risinājumu.',
        'Mums nāksies meklēt citu risinājumu.',
      ),
      true,
    );
    assert.equal(matchesExactAnswer('kad tu pārnāksi mājās?', 'Kad tu pārnāksi mājās?'), false);
  });

  it('shuffles chunks deterministically without mutating the source array', () => {
    const chunks = ['Kad', 'tu', 'pārnāksi', 'mājās', '?'];
    const first = shuffleChunks(chunks, 'pv_015');
    const second = shuffleChunks(chunks, 'pv_015');

    assert.deepEqual(first, second);
    assert.deepEqual(chunks, ['Kad', 'tu', 'pārnāksi', 'mājās', '?']);
    assert.notDeepEqual(
      first.map((entry) => entry.chunk),
      chunks,
    );
  });
});
