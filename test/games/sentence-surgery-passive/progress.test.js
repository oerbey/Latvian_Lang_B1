import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyProgressAttempt,
  createDefaultProgress,
  normalizeProgress,
  updateProgressSettings,
} from '../../../src/games/sentence-surgery-passive/progress.js';

const validIds = ['a', 'b'];
const validTopics = ['library', 'work'];

test('default progress factory returns independent backward-compatible state', () => {
  const first = createDefaultProgress();
  const second = createDefaultProgress();

  assert.deepEqual(first, {
    completedItemIds: [],
    totalAttempts: 0,
    correctCount: 0,
    streak: 0,
    updatedAt: null,
    settings: { topic: 'all', order: 'shuffle' },
  });
  first.completedItemIds.push('a');
  assert.deepEqual(second.completedItemIds, []);
});

test('normalization migrates legacy progress and filters stale completion IDs', () => {
  const migrated = normalizeProgress(
    {
      completedItemIds: ['a', 'a', 'stale'],
      totalAttempts: 5,
      correctCount: 3,
      streak: 2,
      updatedAt: '2026-07-31T10:00:00.000Z',
    },
    validIds,
    validTopics,
  );

  assert.deepEqual(migrated.completedItemIds, ['a']);
  assert.deepEqual(migrated.settings, { topic: 'all', order: 'shuffle' });
  assert.equal(migrated.totalAttempts, 5);
  assert.equal(migrated.correctCount, 3);
  assert.equal(migrated.streak, 2);
});

test('settings are normalized, persisted in the progress shape, and constrained to known topics', () => {
  const withSettings = updateProgressSettings(
    createDefaultProgress(),
    { topic: 'library', order: 'sequential' },
    validIds,
    validTopics,
  );
  assert.deepEqual(withSettings.settings, { topic: 'library', order: 'sequential' });

  const normalized = normalizeProgress(
    { ...withSettings, settings: { topic: 'missing', order: 'unexpected' } },
    validIds,
    validTopics,
  );
  assert.deepEqual(normalized.settings, { topic: 'all', order: 'shuffle' });
});

test('failed and successful attempts update totals, streak, and completion immutably', () => {
  const initial = {
    ...createDefaultProgress(),
    streak: 4,
  };
  const failed = applyProgressAttempt(
    initial,
    { itemId: 'a', correct: false, updatedAt: '2026-07-31T10:00:00.000Z' },
    validIds,
    validTopics,
  );
  assert.equal(failed.totalAttempts, 1);
  assert.equal(failed.correctCount, 0);
  assert.equal(failed.streak, 0);
  assert.deepEqual(failed.completedItemIds, []);

  const solved = applyProgressAttempt(
    failed,
    { itemId: 'a', correct: true, updatedAt: '2026-07-31T10:01:00.000Z' },
    validIds,
    validTopics,
  );
  assert.equal(solved.totalAttempts, 2);
  assert.equal(solved.correctCount, 1);
  assert.equal(solved.streak, 1);
  assert.deepEqual(solved.completedItemIds, ['a']);
  assert.deepEqual(initial.completedItemIds, []);
});

test('review attempts are ephemeral and never remove or add completion', () => {
  const completed = {
    ...createDefaultProgress(),
    completedItemIds: ['a'],
    totalAttempts: 2,
    correctCount: 2,
    streak: 2,
  };
  const failedReview = applyProgressAttempt(
    completed,
    { itemId: 'a', correct: false, review: true },
    validIds,
    validTopics,
  );
  assert.deepEqual(failedReview.completedItemIds, ['a']);
  assert.equal(failedReview.streak, 0);

  const successfulReview = applyProgressAttempt(
    failedReview,
    { itemId: 'b', correct: true, review: true },
    validIds,
    validTopics,
  );
  assert.deepEqual(successfulReview.completedItemIds, ['a']);
  assert.equal(successfulReview.totalAttempts, 4);
  assert.equal(successfulReview.correctCount, 3);
  assert.equal(successfulReview.streak, 1);
});
