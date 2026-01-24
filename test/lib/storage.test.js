import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CURRENT_SCHEMA_VERSION,
  PROGRESS_SCHEMA_VERSION,
  loadAppState,
  loadProgressState,
  loadJSON,
  loadString,
  readGameProgress,
  saveJSON,
  saveString,
  writeGameProgress,
} from '../../src/lib/storage.js';

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

const memoryStorage = createMemoryStorage();
globalThis.localStorage = memoryStorage;

test('loadJSON returns fallback on malformed JSON', () => {
  memoryStorage.clear();
  memoryStorage.setItem('broken', '{oops');
  const fallback = { ok: true };
  const result = loadJSON('broken', fallback);
  assert.deepEqual(result, fallback);
});

test('saveJSON/loadJSON round trip works', () => {
  memoryStorage.clear();
  const payload = { score: 3, streak: 2 };
  assert.equal(saveJSON('progress', payload), true);
  assert.deepEqual(loadJSON('progress', {}), payload);
});

test('loadString/saveString round trip works', () => {
  memoryStorage.clear();
  assert.equal(saveString('theme', 'dark'), true);
  assert.equal(loadString('theme', null), 'dark');
});

test('loadAppState migrates missing schemaVersion', () => {
  memoryStorage.clear();
  memoryStorage.setItem('llb1:app-state', JSON.stringify({ theme: 'dark' }));
  const state = loadAppState();
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(state.theme, 'dark');
  assert.equal(state.language, null);
});

test('loadAppState resets on invalid types', () => {
  memoryStorage.clear();
  memoryStorage.setItem('llb1:app-state', JSON.stringify('invalid'));
  const state = loadAppState();
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(state.theme, null);
});

test('loadProgressState migrates legacy game progress', () => {
  memoryStorage.clear();
  memoryStorage.setItem(
    'llb1:maini-vai-mainies:progress',
    JSON.stringify({ xp: 12, streak: 3, lastPlayedISO: '2024-01-01T00:00:00.000Z' }),
  );
  const state = loadProgressState();
  assert.equal(state.schemaVersion, PROGRESS_SCHEMA_VERSION);
  assert.equal(state.games['maini-vai-mainies'].data.xp, 12);
  assert.equal(state.games['maini-vai-mainies'].data.streak, 3);
  assert.equal(memoryStorage.getItem('llb1:maini-vai-mainies:progress'), null);
});

test('readGameProgress/writeGameProgress round trip works', () => {
  memoryStorage.clear();
  const payload = { score: 10, streak: 4 };
  writeGameProgress('demo-game', payload);
  const stored = readGameProgress('demo-game', {});
  assert.deepEqual(stored, payload);
});
