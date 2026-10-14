/* eslint-env node */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_PROGRESS_BYTES,
  validateSaveRequest,
  validateWordQuestState,
} = require('../src/lib/progress-validation');

test('validateSaveRequest enforces the Word Quest contract and size limit', () => {
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

  assert.deepEqual(validateSaveRequest({ gameId: 'word-quest', data, expectedRevision: 0 }), {
    value: { gameId: 'word-quest', data, expectedRevision: 0 },
  });
  assert.match(validateSaveRequest({ gameId: 'other', data, expectedRevision: 0 }).error, /gameId/);
  assert.match(validateSaveRequest({ gameId: 'word-quest', data }).error, /expectedRevision/);
  assert.match(
    validateSaveRequest({ gameId: 'word-quest', data: { ...data, level: -1 }, expectedRevision: 0 })
      .error,
    /level/,
  );

  const oversized = { text: 'x'.repeat(MAX_PROGRESS_BYTES) };
  assert.match(validateWordQuestState(oversized), /exceeds/);
});
