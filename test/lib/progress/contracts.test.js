import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { getProgressAdapter } from '../../../src/lib/progress/index.js';

const wordQuest = getProgressAdapter('word-quest');
const verbs = getProgressAdapter('darbibas-vards');
const fixture = async (name) =>
  JSON.parse(
    await readFile(new URL(`../../fixtures/progress/${name}.json`, import.meta.url), 'utf8'),
  );

test('default snapshots are detached and represent zero attempts without an invented accuracy', () => {
  for (const adapter of [wordQuest, verbs]) {
    const first = adapter.createDefault();
    assert.equal(adapter.validate(first), null);
    assert.deepEqual(adapter.normalize(null), first);
    assert.deepEqual(adapter.normalize(first), first);
    assert.equal(adapter.summarize(first).attempts, 0);
    assert.equal(adapter.summarize(first).accuracy, null);
    assert.equal(adapter.summarize(first).lastPlayedAt, null);
    first.schemaVersion = 999;
    assert.equal(adapter.createDefault().schemaVersion, 1);
  }
});

test('Word Quest preserves accepted wire data, unknown fields and existing API compatibility', async () => {
  const original = await fixture('word-quest');
  original.extension = { retained: true };
  const restored = wordQuest.normalize(original);
  assert.deepEqual(restored, original);
  const require = createRequire(import.meta.url);
  const { validateSaveRequest } = require('../../../api/src/lib/progress-validation.js');
  assert.equal(
    (await validateSaveRequest({ gameId: 'word-quest', data: restored, expectedRevision: 5 }))
      .error,
    undefined,
  );
  restored.worlds.verbs.completed.push(2);
  restored.extension.retained = false;
  assert.deepEqual(original.worlds.verbs.completed, [0, 1]);
  assert.equal(original.extension.retained, true);
});

test('Word Quest summary derives counts from saved answers and authoritative world definitions', async () => {
  const data = await fixture('word-quest');
  data.worlds.verbs.completed.push(1, -1, 500, '2');
  data.worlds.retired = { completed: [0, 1, 2] };
  assert.deepEqual(wordQuest.summarize(data, { worldNodeCounts: { verbs: 10, prefixes: 8 } }), {
    attempts: 12,
    correct: 9,
    accuracy: 75,
    lastPlayedAt: null,
    completion: { completed: 3, total: 18 },
    xp: 125,
    bestStreak: 4,
  });
  assert.equal(wordQuest.summarize(data).completion, null);
  assert.throws(() => wordQuest.summarize(data, { worldNodeCounts: { verbs: -1 } }), TypeError);
  const sparse = { xp: 12, worlds: {} };
  assert.equal(wordQuest.validate(sparse), null);
  const summary = wordQuest.summarize(sparse);
  for (const key of ['attempts', 'correct', 'accuracy', 'lastPlayedAt', 'bestStreak']) {
    assert.equal(summary[key], null, key);
  }
  assert.equal(wordQuest.normalize(sparse).schemaVersion, 1);
});

test('Darbības Vārdi restores partial and completed boards without adding attempts or moving cursor', async () => {
  const data = await fixture('darbibas-vards');
  assert.equal(verbs.validate(data), null);
  assert.deepEqual(verbs.normalize(data), data);
  assert.deepEqual(verbs.normalize(verbs.normalize(data)), data);
  data.currentBoard.matchedIds = [...data.currentBoard.itemIds];
  const restored = verbs.normalize(data);
  assert.deepEqual(restored, data);
  restored.stats['abonēt|to subscribe'].correct++;
  restored.lockedSet.order.pop();
  assert.equal(data.stats['abonēt|to subscribe'].correct, 3);
  assert.equal(data.lockedSet.order.length, 3);
});

test('Darbības Vārdi reports lifetime answers, current coverage, and actual last answer time', async () => {
  const data = await fixture('darbibas-vards');
  data.stats.unattempted = { correct: 0, incorrect: 0, lastSeen: 1794659999999 };
  assert.deepEqual(verbs.summarize(data, { itemIds: [...data.currentBoard.itemIds, 'new-word'] }), {
    attempts: 6,
    correct: 3,
    accuracy: 50,
    lastPlayedAt: new Date(1794650460000).toISOString(),
    wordsPractised: 2,
    coverage: { practised: 2, total: 3 },
  });
  assert.equal(verbs.summarize(data).coverage, null);
  assert.deepEqual(verbs.summarize(data, { itemIds: [] }).coverage, { practised: 0, total: 0 });
});

test('dataset changes prune resume state, retain historical statistics and preserve next surviving item', async () => {
  const data = await fixture('darbibas-vards');
  data.lockedSet.cursor = 1;
  data.lockedSet.lastSliceStart = 2;
  data.lockedSet.order.push(data.lockedSet.order[1]);
  data.currentBoard.matchedIds.push(data.currentBoard.matchedIds[0]);
  const retained = data.lockedSet.order[1];
  const restored = verbs.normalize(data, { itemIds: [retained, 'atbildēt|to answer'] });
  assert.deepEqual(restored.lockedSet.order, [retained, 'atbildēt|to answer']);
  assert.equal(restored.lockedSet.cursor, 0);
  assert.equal(restored.lockedSet.lastSliceStart, 1);
  assert.deepEqual(restored.currentBoard, { itemIds: [retained], matchedIds: [], wrong: 2 });
  assert.deepEqual(restored.stats, data.stats);
  assert.equal(verbs.summarize(restored).attempts, 6);
  assert.deepEqual(verbs.summarize(restored, { itemIds: [retained] }).coverage, {
    practised: 1,
    total: 1,
  });
  const empty = verbs.normalize(data, { itemIds: [] });
  assert.equal(empty.currentBoard, null);
  assert.deepEqual(empty.lockedSet, {
    order: [],
    cursor: 0,
    lastSliceStart: null,
    priorityChain: {},
  });
  assert.deepEqual(empty.recentSets, []);
  assert.deepEqual(empty.stats, data.stats);
});

test('Darbības Vārdi snapshot excludes device speech preferences and extra engine fields', async () => {
  const data = await fixture('darbibas-vards');
  data.speakOn = true;
  data.settings.speech = true;
  data.currentBoard.selections = { lv: 0, tr: null };
  const normalized = verbs.normalize(data);
  assert.equal(normalized.speakOn, undefined);
  assert.equal(normalized.settings.speech, undefined);
  assert.equal(normalized.currentBoard.selections, undefined);
});

test('malformed snapshots and future schemas fail without altering the original data', async () => {
  for (const adapter of [wordQuest, verbs]) {
    for (const bad of [[], 'broken', 42, null]) assert.ok(adapter.validate(bad));
    const future = { ...adapter.createDefault(), schemaVersion: 2 };
    assert.match(adapter.validate(future), /schemaVersion/);
    assert.throws(() => adapter.normalize(future), TypeError);
    assert.equal(future.schemaVersion, 2);
    const circular = adapter.createDefault();
    circular.circular = circular;
    assert.match(adapter.validate(circular), /serializable/);
    const oversized = { ...adapter.createDefault(), padding: 'ā'.repeat(adapter.maxBytes) };
    assert.match(adapter.validate(oversized), /exceeds/);
  }
  for (const value of [-1, 0.5, Infinity, NaN, '3']) {
    assert.ok(wordQuest.validate({ totalCorrect: value }));
    const invalid = await fixture('darbibas-vards');
    invalid.stats['abonēt|to subscribe'].correct = value;
    assert.ok(verbs.validate(invalid));
  }
  for (const mutate of [
    (data) => {
      data.settings.language = 'lv';
    },
    (data) => {
      data.settings.boardSize = 100;
    },
    (data) => {
      data.lockedSet.cursor = -1;
    },
    (data) => {
      data.lockedSet.priorityChain.word = 3;
    },
    (data) => {
      data.recentSets = Array(6).fill([]);
    },
    (data) => {
      data.currentBoard.matchedIds.push('outside-board');
    },
    (data) => {
      data.currentBoard.wrong = -1;
    },
    (data) => {
      data.stats['abonēt|to subscribe'].lastSeen = 8640000000000001;
    },
  ]) {
    const invalid = await fixture('darbibas-vards');
    mutate(invalid);
    assert.ok(verbs.validate(invalid));
    assert.throws(() => verbs.normalize(invalid), TypeError);
  }
});

test('the complete current vocabulary fits the bounded Darbības Vārdi snapshot', async () => {
  const words = JSON.parse(
    await readFile(new URL('../../../data/words.json', import.meta.url), 'utf8'),
  );
  const ids = words.map(({ lv, en }) => `${lv}|${en || ''}`);
  const data = verbs.createDefault();
  data.stats = Object.fromEntries(
    ids.map((id) => [id, { correct: 10, incorrect: 5, lastSeen: 1794650460000 }]),
  );
  data.lockedSet.order = ids;
  data.recentSets = Array.from({ length: 5 }, () => [...ids]);
  data.settings.lockedSetSize = ids.length;
  assert.equal(verbs.validate(data), null);
  assert.deepEqual(verbs.summarize(data, { itemIds: ids }).coverage, {
    practised: new Set(ids).size,
    total: new Set(ids).size,
  });
});

test('answer totals never overflow into an inaccurate or infinite summary', () => {
  const data = verbs.createDefault();
  data.stats.word = { correct: Number.MAX_SAFE_INTEGER, incorrect: 1, lastSeen: 0 };
  assert.match(verbs.validate(data), /safe integer/);
  assert.throws(() => verbs.summarize(data), TypeError);
  const legacy = { totalCorrect: Number.MAX_VALUE, totalWrong: Number.MAX_VALUE };
  assert.equal(wordQuest.validate(legacy), null);
  assert.equal(wordQuest.summarize(legacy).attempts, null);
  assert.equal(wordQuest.summarize(legacy).accuracy, null);
});
