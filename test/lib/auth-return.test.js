import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consumeAuthReturn,
  readAuthReturn,
  rememberAuthReturn,
  safeAuthReturnPath,
} from '../../src/lib/auth-return.js';

test('callbacks accept only published local destinations and never auth parameters or external URLs', () => {
  for (const path of [
    '/',
    '/index.html',
    '/my-progress.html',
    '/darbibas-vards.html',
    '/word-quest.html',
  ]) {
    assert.equal(safeAuthReturnPath(path), path);
  }
  for (const path of [
    '//evil.test',
    'https://example.test/word-quest.html',
    'javascript:alert(1)',
    '/auth-probe.html',
    '/api/authSession',
    '/.auth/login/aad',
    '/missing.html',
    '/word-quest.html?code=private',
    '/word-quest.html#access_token=private',
    '/%2f%2fevil.test',
    '/\\evil.test',
    '../word-quest.html',
    null,
    undefined,
  ])
    assert.equal(safeAuthReturnPath(path), '/index.html');
});

test('return destinations are scoped to the initiating tab and consumed after success', () => {
  function tabStorage() {
    const values = new Map();
    return {
      setItem: (key, value) => values.set(key, value),
      getItem: (key) => values.get(key),
      removeItem: (key) => values.delete(key),
    };
  }
  const first = tabStorage();
  const second = tabStorage();
  rememberAuthReturn('/darbibas-vards.html', first);
  rememberAuthReturn('/word-quest.html', second);
  assert.equal(readAuthReturn(first), '/darbibas-vards.html');
  assert.equal(consumeAuthReturn(first), '/darbibas-vards.html');
  assert.equal(readAuthReturn(first), '/index.html');
  assert.equal(readAuthReturn(second), '/word-quest.html');
  rememberAuthReturn('//evil.test', first);
  assert.equal(consumeAuthReturn(first), '/index.html');
});

test('an inaccessible return store falls back to Home', () => {
  const blocked = {
    getItem: () => {
      throw new Error('Blocked storage');
    },
    removeItem: () => {
      throw new Error('Blocked storage');
    },
  };
  assert.equal(readAuthReturn(blocked), '/index.html');
  assert.equal(consumeAuthReturn(blocked), '/index.html');
});
