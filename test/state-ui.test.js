import test from 'node:test';
import assert from 'node:assert/strict';
import { stubMatchDom } from './helpers/dom-stubs.js';

const { statusEl } = stubMatchDom();

const { setStatus, clickables, hitAt, resetClicks } = await import('../src/state.js');

test('setStatus updates status element text', () => {
  setStatus('Hello');
  assert.equal(statusEl.textContent, 'Hello');
});

test('hitAt finds clickable in bounds', () => {
  resetClicks();
  clickables.push({ x: 10, y: 20, w: 100, h: 50, tag: 'box' });
  assert.equal(hitAt(15, 25)?.tag, 'box');
  assert.equal(hitAt(0, 0), null);
});

