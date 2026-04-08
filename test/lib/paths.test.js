import test from 'node:test';
import assert from 'node:assert/strict';

import { assetUrl } from '../../src/lib/paths.js';

test('assetUrl resolves relative to document baseURI', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { baseURI: 'https://example.com/latvian/' };

  try {
    assert.equal(assetUrl('data/words.json'), 'https://example.com/latvian/data/words.json');
    assert.equal(assetUrl('/data/words.json'), 'https://example.com/latvian/data/words.json');
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
});
