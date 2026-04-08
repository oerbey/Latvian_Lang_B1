import test from 'node:test';
import assert from 'node:assert/strict';

import { getEnding } from '../../../src/games/endings-builder/endings-resolver.js';

test('Decl1 masc GEN.SG is -a', () => {
  const out = getEnding({
    pos: 'nouns',
    schema: 'decl1_masc',
    gram: { case: 'GEN', number: 'SG' },
  });
  assert.equal(out, '-a');
});
