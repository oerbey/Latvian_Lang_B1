import test from 'node:test';
import assert from 'node:assert/strict';
import { stubMatchDom } from '../helpers/dom-stubs.js';

const { statusEl } = stubMatchDom();

const { getState, resetState, setState, mulberry32 } = await import('../../src/lib/state.js');
const { clickables } = await import('../../src/lib/clickables.js');
const { setStatusHandler } = await import('../../src/lib/status.js');
const match = await import('../../src/lib/match.js');

setStatusHandler((message) => {
  statusEl.textContent = message || '';
});

test('full deck size caps at 15', () => {
  const many = Array.from({ length: 20 }, (_, i) => ({
    translations: { lv: 'lv' + i, en: 'en' + i },
    games: ['match']
  }));
  resetState();
  setState({
    DATA: { units: [{ name: 'u', entries: many }] },
    targetLang: 'en',
    deckSizeMode: 'full',
    difficulty: 'practice',
    rng: mulberry32(42),
  });

  match.startMatchRound();
  const ms = getState().matchState;
  assert.equal(ms.total, 15);
  assert.equal(ms.left.length, 15);
  assert.equal(ms.right.length, 15);
});

test('mismatch shows prefix hint and increments errors', () => {
  resetState();
  setState({
    DATA: {
      notes: { 'prefix:iz': 'to the outside', 'prefix:pa': 'across/over' },
      units: [
        {
          name: 'u',
          entries: [
            { translations: { lv: 'iet', en: 'go' }, games: ['match'], tags: ['prefix:iz'] },
            { translations: { lv: 'iet2', en: 'go2' }, games: ['match'], tags: ['prefix:pa'] }
          ]
        }
      ]
    },
    targetLang: 'en',
    deckSizeMode: 'full',
    difficulty: 'practice',
    rng: mulberry32(7),
  });

  match.startMatchRound();
  match.drawMatch();

  // pick a left and a mismatching right
  const lefts = clickables.filter(c => c.tag?.startsWith('L:'));
  const rights = clickables.filter(c => c.tag?.startsWith('R:'));
  const left = lefts[0];
  const right = rights.find(r => r.data?.key !== left.data?.key);
  // ensure we have a mismatch pair
  assert.ok(left && right && right.data.key !== left.data.key);

  // Click left then wrong right
  left.onClick();
  right.onClick();

  const ms = getState().matchState;
  assert.equal(ms.errors, 1);
  assert.ok(ms.feedback.startsWith('Priedēklis:'));
});

test('solving the only pair records result and restarts', () => {
  resetState();
  setState({
    DATA: {
      notes: {},
      units: [
        {
          name: 'u',
          entries: [ { translations: { lv: 'braukt', en: 'drive' }, games: ['match'] } ]
        }
      ]
    },
    targetLang: 'en',
    deckSizeMode: 'full',
    difficulty: 'practice',
    rng: mulberry32(9),
  });
  statusEl.textContent = '';

  const before = getState().results.length;
  match.startMatchRound();
  match.drawMatch();

  const left = clickables.find(c => c.tag?.startsWith('L:'));
  const rights = clickables.filter(c => c.tag?.startsWith('R:'));
  const right = rights.find(r => r.data?.key === left.data?.key);
  left.onClick();
  right.onClick();

  // End of round should push a result and update status
  const results = getState().results;
  assert.equal(results.length, before + 1);
  const last = results[results.length - 1];
  assert.equal(last.mode, 'MATCH');
  assert.equal(last.correct, 1);
  assert.equal(last.total, 1);
  assert.ok(statusEl.textContent.includes('Match: 1/1'));
});
