import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CURRENT_SCHEMA_VERSION,
  loadAppState,
  loadJSON,
  loadString,
  saveJSON,
  saveString,
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
