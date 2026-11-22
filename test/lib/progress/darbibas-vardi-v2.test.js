import assert from 'node:assert/strict';
import test from 'node:test';
import { readLegacyV2Progress } from '../../../src/games/darbibas-vardi-v2/legacy-progress.js';
import { darbibasVardiV2Progress as progress } from '../../../src/lib/progress/darbibas-vardi-v2.js';

test('legacy mastery stays with the guest and uses the same mastery rule as the deck', () => {
  const snapshot = {
    records: {
      būt: { box: 4, dueAt: 2000, seen: 4, correct: 4, wrong: 0 },
      retired: { box: 4, dueAt: 2000, seen: 9, correct: 8, wrong: 1 },
      zero: { box: 4, dueAt: 2000, seen: 0, correct: 0, wrong: 0 },
    },
    lastPlayedISO: '2026-11-18T10:00:00.000Z',
    xp: 140,
    language: 'ru',
  };
  const storage = {
    getItem: () => JSON.stringify({ games: { 'darbibas-vardi-v2': { data: snapshot } } }),
  };
  assert.equal(readLegacyV2Progress(storage, 'account'), null);
  const { data } = readLegacyV2Progress(storage, null);
  assert.equal(data.language, 'ru');
  assert.equal(data.checkpoint, null);
  assert.deepEqual(progress.summarize(data, { itemIds: ['būt', 'iet', 'zero'] }), {
    attempts: 13,
    correct: 12,
    accuracy: 92,
    mastery: { mastered: 1, total: 3 },
    xp: 140,
    lastPlayedAt: snapshot.lastPlayedISO,
    bestStreak: 0,
  });
});

test('V2 validates round boundaries and derives counters from answers', () => {
  const data = progress.createDefault();
  data.checkpoint = {
    queue: ['iet'],
    retried: [],
    review: { būt: [0, 1] },
    answered: 1,
    correct: 1,
    streak: 1,
    bestStreak: 1,
    xp: 10,
  };
  assert.deepEqual(progress.normalize(data), data);
  assert.equal(progress.summarize(data).accuracy, null);
  assert.match(
    progress.validate({ ...data, checkpoint: { ...data.checkpoint, queue: ['iet', 'iet'] } }),
    /checkpoint/,
  );
  assert.match(
    progress.validate({ ...data, checkpoint: { ...data.checkpoint, correct: 2 } }),
    /checkpoint/,
  );
  assert.match(
    progress.validate({ ...data, checkpoint: { ...data.checkpoint, answered: 21 } }),
    /checkpoint/,
  );
  assert.match(progress.validate({ ...data, records: { būt: { box: 5 } } }), /mastery/);
  assert.match(progress.validate({ ...data, schemaVersion: 2 }), /schemaVersion/);
});
