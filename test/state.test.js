import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, state, shuffle, choice } from '../src/state.js';

// mulberry32 should produce a deterministic sequence for a given seed

test('mulberry32 produces deterministic values', () => {
  const rng = mulberry32(1);
  assert.equal(rng(), 0.6270739405881613);
  assert.equal(rng(), 0.002735721180215478);
});

// shuffle should reorder array deterministically with seeded rng

test('shuffle reorders array using state.rng', () => {
  state.rng = mulberry32(1);
  const arr = [1, 2, 3, 4, 5];
  const result = shuffle(arr.slice());
  assert.deepStrictEqual(result, [5, 3, 2, 1, 4]);
});

// choice should pick an element based on state.rng

test('choice selects element from array', () => {
  state.rng = mulberry32(1);
  const value = choice(['a', 'b', 'c']);
  assert.equal(value, 'b');
});
