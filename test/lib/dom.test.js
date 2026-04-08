import test from 'node:test';
import assert from 'node:assert/strict';

test('dom helpers return null or throw on missing elements', async () => {
  const el = { id: 'example' };
  global.document = {
    getElementById: (id) => (id === 'example' ? el : null),
  };

  const { $id, mustId } = await import('../../src/lib/dom.js');

  assert.equal($id('example'), el);
  assert.equal($id('missing'), null);
  assert.throws(() => mustId('missing'), /Missing required element/);
});

test('on attaches listeners when the target exists', async () => {
  let attached = false;
  const target = {
    addEventListener(event) {
      if (event === 'click') attached = true;
    },
  };

  const { on } = await import('../../src/lib/dom.js');

  assert.equal(
    on(target, 'click', () => {}),
    true,
  );
  assert.equal(attached, true);
  assert.equal(
    on(null, 'click', () => {}),
    false,
  );
});
