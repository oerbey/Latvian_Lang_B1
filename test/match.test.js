import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, state } from '../src/state.js';

// minimal DOM stubs for modules that expect a browser environment
global.window = { devicePixelRatio: 1 };
global.document = {
  getElementById: () => ({
    getContext: () => ({ setTransform(){}, measureText(){ return { width: 0 }; } }),
    width: 980,
    height: 560,
    style: {},
    parentElement: { offsetWidth: 980 },
    getBoundingClientRect: () => ({ left: 0, top: 0 })
  })
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
