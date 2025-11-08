import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, state } from '../../src/lib/state.js';
import { stubMatchDom } from '../helpers/dom-stubs.js';

const { statusEl } = stubMatchDom();

const { startMatchRound } = await import('../../src/lib/match.js');

test('startMatchRound uses target language entries', () => {
  state.DATA = { units: [ { name:'u1', entries:[{ translations:{ lv:'braukt', ru:'ехать' }, games:['match'] }] } ] };
  state.targetLang = 'ru';
  state.deckSizeMode = 'full';
  state.difficulty = 'practice';
  state.rng = mulberry32(1);

  startMatchRound();
  const ms = state.matchState;
  assert.equal(ms.left[0].txt, 'braukt');
  assert.equal(ms.right[0].txt, 'ехать');
});

test('auto deck size does not exceed available cards', () => {
  state.DATA = { units: [ { name:'u1', entries:[{ translations:{ lv:'a', en:'a' }, games:['match'] }] } ] };
  state.targetLang = 'en';
  state.deckSizeMode = 'auto';
  state.difficulty = 'practice';
  state.rng = mulberry32(2);

  startMatchRound();
  const ms = state.matchState;
  assert.equal(ms.total, 1);
});

test('empty deck is handled gracefully', () => {
  state.DATA = { units: [] };
  state.targetLang = 'en';
  state.deckSizeMode = 'auto';
  state.difficulty = 'practice';
  state.rng = mulberry32(3);
  statusEl.textContent = '';

  startMatchRound();

  assert.equal(state.matchState, null);
  assert.equal(statusEl.textContent, 'No items to match.');
});
