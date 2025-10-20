import test from 'node:test';
import assert from 'node:assert/strict';

import { createSeededRng, seededShuffle, stringToSeed } from '../src/games/travel-tracker/utils.js';

test('seeded shuffle returns deterministic order for same seed', () => {
  const seed = 1337;
  const values = ['Rīga', 'Sigulda', 'Cēsis', 'Valmiera', 'Ventspils'];
  const rngA = createSeededRng(seed);
  const rngB = createSeededRng(seed);

  const shuffledA = seededShuffle(values, rngA);
  const shuffledB = seededShuffle(values, rngB);

  assert.equal(shuffledA.length, values.length);
  assert.deepEqual(shuffledA, shuffledB);
  assert.deepEqual(values, ['Rīga', 'Sigulda', 'Cēsis', 'Valmiera', 'Ventspils']);
});

test('different seeds produce different permutations', () => {
  const values = Array.from({ length: 10 }, (_, idx) => idx + 1);
  const rngA = createSeededRng(42);
  const rngB = createSeededRng(42042);

  const shuffledA = seededShuffle(values, rngA);
  const shuffledB = seededShuffle(values, rngB);

  assert.equal(shuffledA.length, values.length);
  assert.equal(shuffledB.length, values.length);
  assert.notDeepEqual(shuffledA, shuffledB);
});

test('stringToSeed produces stable uint32 values', () => {
  const value = stringToSeed('travel-tracker');
  assert.equal(value >>> 0, value);
  assert.equal(stringToSeed('travel-tracker'), value);
  assert.notEqual(stringToSeed('Travel-Tracker'), value);
});
