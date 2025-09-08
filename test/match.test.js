import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, state } from '../src/state.js';

// minimal DOM stubs for modules that expect a browser environment
global.window = { devicePixelRatio: 1 };
const canvasEl = {
  getContext: () => ({ setTransform(){}, measureText(){ return { width: 0 }; }, clearRect(){} }),
  width: 980,
  height: 560,
  style: {},
  parentElement: { offsetWidth: 980 },
  getBoundingClientRect: () => ({ left: 0, top: 0 })
};
const statusEl = { textContent: '' };
const srEl = { innerHTML: '' };

global.document = {
  getElementById: (id) => {
    if(id === 'canvas') return canvasEl;
    if(id === 'status') return statusEl;
    if(id === 'sr-game-state') return srEl;
    return canvasEl;
  }
};

const { startMatchRound } = await import('../src/match.js');

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
