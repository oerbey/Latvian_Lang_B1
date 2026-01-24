import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatError,
  installGlobalErrorHandlers,
  isFatalErrorShown,
  resetFatalErrorState,
  showFatalError,
} from '../../src/lib/errors.js';

function createDocumentStub() {
  const nodes = new Map();
  const makeNode = () => ({
    id: '',
    className: '',
    style: {},
    textContent: '',
    appendChild(node) {
      if (node && node.id) nodes.set(node.id, node);
    },
    setAttribute() {},
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
  });

  const head = makeNode();
  const body = makeNode();
  const documentElement = makeNode();

  return {
    nodes,
    doc: {
      head,
      body,
      documentElement,
      createElement() {
        return makeNode();
      },
      getElementById(id) {
        return nodes.get(id) || null;
      },
    },
  };
}

test('formatError returns stable message text', () => {
  assert.equal(formatError('Oops').message, 'Oops');
  assert.equal(formatError(new Error('Boom')).message, 'Boom');
  assert.equal(formatError({}).message, 'Unknown error');
});

test('showFatalError only renders once', () => {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  const { doc } = createDocumentStub();

  globalThis.document = doc;
  globalThis.window = { location: { reload() {} } };
  resetFatalErrorState();

  const first = showFatalError(new Error('Crash'));
  const second = showFatalError(new Error('Again'));

  assert.equal(first, true);
  assert.equal(second, false);

  globalThis.document = prevDocument;
  globalThis.window = prevWindow;
});

test('unhandledrejection triggers showFatalError', () => {
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const { doc } = createDocumentStub();
  const handlers = {};

  globalThis.document = doc;
  globalThis.window = {
    addEventListener(type, handler) {
      handlers[type] = handler;
    },
    location: { reload() {} },
  };

  resetFatalErrorState();
  installGlobalErrorHandlers();
  handlers.unhandledrejection({ reason: new Error('Promise failed') });

  assert.equal(isFatalErrorShown(), true);

  globalThis.window = prevWindow;
  globalThis.document = prevDocument;
});
