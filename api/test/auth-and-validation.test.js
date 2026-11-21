/* eslint-env node */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_PROGRESS_BYTES,
  validateSaveRequest,
  validateWordQuestState,
} = require('../src/lib/progress-validation');

test('validateSaveRequest enforces the Word Quest contract and size limit', async () => {
  const data = {
    schemaVersion: 1,
    xp: 10,
    level: 1,
    streak: 2,
    bestStreak: 3,
    totalCorrect: 4,
    totalWrong: 1,
    worlds: {},
  };

  assert.deepEqual(await validateSaveRequest({ gameId: 'word-quest', data, expectedRevision: 0 }), {
    value: { gameId: 'word-quest', data, expectedRevision: 0 },
  });
  assert.match(
    (await validateSaveRequest({ gameId: 'other', data, expectedRevision: 0 })).error,
    /gameId/,
  );
  assert.match(
    (await validateSaveRequest({ gameId: 'word-quest', data })).error,
    /expectedRevision/,
  );
  assert.match(
    (
      await validateSaveRequest({
        gameId: 'word-quest',
        data: { ...data, level: -1 },
        expectedRevision: 0,
      })
    ).error,
    /level/,
  );

  const oversized = { text: 'x'.repeat(MAX_PROGRESS_BYTES) };
  assert.match(validateWordQuestState(oversized), /exceeds/);
});
