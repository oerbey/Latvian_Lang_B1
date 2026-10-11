import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('authentication callbacks and API responses bypass service-worker caching', async () => {
  const listeners = new Map();
  const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const context = vm.createContext({
    URL,
    self: {
      location: { origin: 'https://example.test' },
      addEventListener: (name, callback) => listeners.set(name, callback),
    },
    fetch: () => {
      throw new Error('Authentication traffic must bypass the worker');
    },
    caches: {
      open: () => {
        throw new Error('Authentication must not open a cache');
      },
    },
  });
  vm.runInContext(source, context);
  const onFetch = listeners.get('fetch');
  for (const path of [
    '/auth-probe.html?code=synthetic-code',
    '/.auth/login/aad/callback?code=synthetic-code',
    '/api/authProbe',
    '/api/getProgress?gameId=word-quest',
    '/assets/vendor/msal-browser/msal-browser.min.js',
    '/src/auth-probe.js',
  ]) {
    onFetch({
      request: { url: `https://example.test${path}`, method: 'GET', mode: 'navigate' },
      respondWith: () => {
        throw new Error('Worker must not intercept authentication');
      },
    });
  }
});
