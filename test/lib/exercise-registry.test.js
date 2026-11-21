import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { EXERCISES, getExercise } from '../../src/lib/exercise-registry.js';
import { getProgressAdapter } from '../../src/lib/progress/index.js';
import { NAV_ITEMS } from '../../scripts/nav-config.js';

test('registry covers every published exercise with a unique stable ID and existing page', async () => {
  const links = NAV_ITEMS.filter(({ href }) => href !== 'index.html').map(({ href }) => href);
  assert.equal(new Set(EXERCISES.map(({ id }) => id)).size, EXERCISES.length);
  assert.equal(new Set(EXERCISES.map(({ href }) => href)).size, EXERCISES.length);
  assert.deepEqual(EXERCISES.map(({ href }) => href).sort(), links.sort());
  for (const entry of EXERCISES) {
    assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(entry.title);
    assert.ok(['board', 'checkpoint', 'round'].includes(entry.resume));
    assert.equal(new Set(entry.metrics).size, entry.metrics.length);
    await access(new URL(`../../${entry.href}`, import.meta.url));
  }
  const homepage = await readFile(new URL('../../scripts/homepage.js', import.meta.url), 'utf8');
  for (const [, href] of homepage.matchAll(/href: '([^']+\.html)'/g)) {
    assert.ok(
      EXERCISES.some((entry) => entry.href === href),
      href,
    );
  }
});

test('contract availability does not enable a planned exercise or alias another version', () => {
  assert.deepEqual(
    EXERCISES.filter(({ tracking }) => tracking === 'cloud').map(({ id }) => id),
    ['darbibas-vards', 'word-quest'],
  );
  assert.ok(getProgressAdapter('word-quest'));
  assert.ok(getProgressAdapter('darbibas-vards'));
  assert.equal(getExercise('darbibas-vards').tracking, 'cloud');
  assert.equal(getProgressAdapter('darbibas-vardi-v2'), null);
  assert.notEqual(
    getExercise('character-traits-match').id,
    getExercise('character-traits-expansion').id,
  );
  for (const unknown of ['__proto__', 'constructor', '', null, 'not-a-game']) {
    assert.equal(getExercise(unknown), null);
    assert.equal(getProgressAdapter(unknown), null);
  }
  assert.throws(() => {
    getExercise('word-quest').tracking = 'planned';
  }, TypeError);
  assert.throws(() => {
    getExercise('word-quest').metrics.push('mastery');
  }, TypeError);
});
