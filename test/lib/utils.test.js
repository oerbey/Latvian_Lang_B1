import test from 'node:test';
import assert from 'node:assert/strict';

import { clamp, shuffle } from '../../src/lib/utils.js';

test('clamp keeps values within bounds', () => {
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(12, 0, 10), 10);
});

test('shuffle preserves items and length', () => {
  const input = [1, 2, 3, 4];
  const output = shuffle(input, () => 0.5);

  assert.equal(output.length, input.length);
  assert.deepEqual([...output].sort(), [...input].sort());
});

test('shuffle does not mutate the original array', () => {
  const input = ['a', 'b', 'c'];
  const output = shuffle(input, () => 0.5);

  assert.deepEqual(input, ['a', 'b', 'c']);
  assert.notDeepEqual(output, input);
});
