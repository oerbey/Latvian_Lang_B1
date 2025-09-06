import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, state } from '../src/state.js';

// minimal DOM stubs for modules that expect a browser environment
global.document = {
  getElementById: () => ({
    getContext: () => ({}),
    width: 980,
    height: 560,
    style: {},
    parentElement: { offsetWidth: 980 },
    getBoundingClientRect: () => ({ left: 0, top: 0 })
  })
};

const { startForgeRound, ALL_PREFIXES } = await import('../src/forge.js');

// startForgeRound should create a forgeState with correct options

test('startForgeRound sets up forge state correctly', () => {
  state.DATA = {
    forge: [
      { base: 'darit', translations: { en: 'do' }, correct: 'iz', games: ['forge'] }
    ]
  };
  state.targetLang = 'en';
  state.roundIndex = 0;
  state.rng = mulberry32(1);

  startForgeRound();

  const fs = state.forgeState;
  assert.equal(fs.base, 'darit');
  assert.equal(fs.clue, 'do');
  assert.equal(fs.correct, 'iz');
  assert.equal(fs.options.length, 5);
  assert(fs.options.includes('iz'));
  assert.equal(new Set(fs.options).size, 5);
  fs.options.forEach(p => assert(ALL_PREFIXES.includes(p)));
});

test('startForgeRound uses target language clue', () => {
  state.DATA = {
    forge: [
      { base: 'iet', translations: { ru: 'идти' }, correct: 'aiz', games: ['forge'] }
    ]
  };
  state.targetLang = 'ru';
  state.roundIndex = 0;
  state.rng = mulberry32(2);

  startForgeRound();
  const fs = state.forgeState;
  assert.equal(fs.clue, 'идти');
  assert.equal(fs.correct, 'aiz');
});
