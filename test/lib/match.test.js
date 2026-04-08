import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, getState, resetState, setState } from '../../src/lib/state.js';
import { stubMatchDom } from '../helpers/dom-stubs.js';

const { statusEl } = stubMatchDom();

const { setStatusHandler } = await import('../../src/lib/status.js');
const { startMatchRound } = await import('../../src/lib/match.js');

setStatusHandler((message) => {
  statusEl.textContent = message || '';
});

test('startMatchRound uses target language entries', () => {
  resetState();
  setState({
    DATA: {
      units: [
        {
          name: 'u1',
          entries: [{ translations: { lv: 'braukt', ru: 'ехать' }, games: ['match'] }],
        },
      ],
    },
    targetLang: 'ru',
    deckSizeMode: 'full',
    difficulty: 'practice',
    rng: mulberry32(1),
  });

  startMatchRound();
  const ms = getState().matchState;
  assert.equal(ms.left[0].txt, 'braukt');
  assert.equal(ms.right[0].txt, 'ехать');
});

test('auto deck size does not exceed available cards', () => {
  resetState();
  setState({
    DATA: {
      units: [{ name: 'u1', entries: [{ translations: { lv: 'a', en: 'a' }, games: ['match'] }] }],
    },
    targetLang: 'en',
    deckSizeMode: 'auto',
    difficulty: 'practice',
    rng: mulberry32(2),
  });

  startMatchRound();
  const ms = getState().matchState;
  assert.equal(ms.total, 1);
});

test('empty deck is handled gracefully', () => {
  resetState();
  setState({
    DATA: { units: [] },
    targetLang: 'en',
    deckSizeMode: 'auto',
    difficulty: 'practice',
    rng: mulberry32(3),
  });
  statusEl.textContent = '';

  startMatchRound();

  assert.equal(getState().matchState, null);
  assert.equal(statusEl.textContent, 'No items to match.');
});
