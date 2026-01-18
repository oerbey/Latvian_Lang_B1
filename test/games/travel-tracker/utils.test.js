import test from 'node:test';
import assert from 'node:assert/strict';

import { createSeededRng, seededShuffle, stringToSeed } from '../../../src/games/travel-tracker/utils.js';

test('seededShuffle produces deterministic order for the same seed', () => {
  const seed = 0xdeadbeef;
  const source = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const original = [...source];

  const shuffledOnce = seededShuffle(source, createSeededRng(seed));
  const shuffledTwice = seededShuffle(source, createSeededRng(seed));

  assert.deepStrictEqual(shuffledOnce, shuffledTwice);
  assert.deepStrictEqual(source, original, 'seededShuffle should not mutate its input');
  assert.notStrictEqual(shuffledOnce, source, 'seededShuffle should return a new array instance');
});

test('different seeds result in different shuffles', () => {
  const sample = Array.from({ length: 12 }, (_, index) => index + 1);
  const first = seededShuffle(sample, createSeededRng(123));
  const second = seededShuffle(sample, createSeededRng(456));

  assert.notDeepStrictEqual(first, second);
});

test('createSeededRng values stay within [0, 1)', () => {
  const rng = createSeededRng(42);
  for (let i = 0; i < 100; i += 1) {
    const value = rng();
    assert.ok(value >= 0 && value < 1, `rng value ${value} should be within [0, 1)`);
  }
});

test('stringToSeed returns stable hashes', () => {
  assert.equal(stringToSeed('riga'), 4048136408);
});

test('createSeededRng produces deterministic values', () => {
  const rng = createSeededRng('riga');
  const values = [rng(), rng(), rng()];
  const expected = [0.5110218906775117, 0.2162245069630444, 0.009080308489501476];

  values.forEach((value, index) => {
    assert.ok(Math.abs(value - expected[index]) < 1e-12);
  });
});

test('seededShuffle preserves items with a stable order', () => {
  const input = ['a', 'b', 'c', 'd'];
  const output = seededShuffle(input, createSeededRng('riga'));

  assert.deepEqual(output, ['b', 'd', 'a', 'c']);
  assert.deepEqual(input, ['a', 'b', 'c', 'd']);
});
