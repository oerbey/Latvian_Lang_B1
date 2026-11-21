import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAuthSdk } from '../../src/lib/auth-sdk.js';

test('concurrent SDK loads share a script and a failed download can be retried', async () => {
  const first = loadAuthSdk();
  const second = loadAuthSdk();
  assert.equal(first, second);
  let scripts = document.querySelectorAll('script[src$="msal-browser.min.js"]');
  assert.equal(scripts.length, 1);
  scripts[0].dispatchEvent(new window.Event('error'));
  await assert.rejects(first, /SDK unavailable/);
  assert.equal(document.querySelectorAll('script[src$="msal-browser.min.js"]').length, 0);
  const retry = loadAuthSdk();
  scripts = document.querySelectorAll('script[src$="msal-browser.min.js"]');
  assert.equal(scripts.length, 1);
  const sdk = { PublicClientApplication: class {} };
  window.msal = sdk;
  scripts[0].dispatchEvent(new window.Event('load'));
  assert.equal(await retry, sdk);
  assert.equal(await loadAuthSdk(), sdk);
  delete window.msal;
  scripts[0].remove();
});
