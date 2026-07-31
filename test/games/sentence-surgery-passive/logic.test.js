import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createReviewQueue,
  createRoundViewModel,
  createUnsolvedQueue,
  filterItemsByTopic,
  gradeChoice,
  ORDER_SEQUENTIAL,
  ORDER_SHUFFLE,
} from '../../../src/games/sentence-surgery-passive/logic.js';

const queueItems = [
  { id: 'a', topic: 'library' },
  { id: 'b', topic: 'library' },
  { id: 'c', topic: 'work' },
];

const roundItem = {
  id: 'PV_TEST_1',
  topic: 'library',
  source: 'Test',
  targetEn: 'The book is being read.',
  errors: [{ type: 'aux_tense', wrong: 'tika', correct: 'tiek' }],
  primaryEditableIndex: 1,
  editableIndices: [1],
  brokenTokens: ['Grāmata', 'tika', 'lasīta', '.'],
  targetTokens: ['Grāmata', 'tiek', 'lasīta', '.'],
  choices: ['tiek', 'tiks'],
};

test('topic filtering returns a copy and supports the all-topics sentinel', () => {
  assert.deepEqual(
    filterItemsByTopic(queueItems, 'library').map((item) => item.id),
    ['a', 'b'],
  );
  const all = filterItemsByTopic(queueItems, 'all');
  assert.deepEqual(all, queueItems);
  assert.notEqual(all, queueItems);
});

test('unsolved and review queues are separate and preserve sequential order', () => {
  const options = {
    topic: 'library',
    order: ORDER_SEQUENTIAL,
    completedItemIds: ['a', 'c'],
  };

  assert.deepEqual(
    createUnsolvedQueue(queueItems, options).map((item) => item.id),
    ['b'],
  );
  assert.deepEqual(
    createReviewQueue(queueItems, options).map((item) => item.id),
    ['a'],
  );
  assert.deepEqual(
    createReviewQueue(queueItems, { ...options, topic: 'all' }).map((item) => item.id),
    ['a', 'c'],
  );
});

test('shuffle order is injectable and avoids an immediate repeat when possible', () => {
  const queue = createUnsolvedQueue(queueItems, {
    order: ORDER_SHUFFLE,
    random: () => 0,
  });
  assert.deepEqual(
    queue.map((item) => item.id),
    ['b', 'c', 'a'],
  );

  const withoutRepeat = createUnsolvedQueue(queueItems, {
    order: ORDER_SHUFFLE,
    lastItemId: 'b',
    random: () => 0,
  });
  assert.notEqual(withoutRepeat[0].id, 'b');
  assert.deepEqual(
    queueItems.map((item) => item.id),
    ['a', 'b', 'c'],
  );
});

test('round view model exposes one inline repair slot without mutating the item', () => {
  const round = createRoundViewModel(roundItem, { selectedChoice: 'tiks' });

  assert.deepEqual(round.prefixTokens, ['Grāmata']);
  assert.deepEqual(round.suffixTokens, ['lasīta', '.']);
  assert.equal(round.brokenToken, 'tika');
  assert.equal(round.targetToken, 'tiek');
  assert.equal(round.currentSentence, 'Grāmata tiks lasīta.');
  assert.deepEqual(roundItem.brokenTokens, ['Grāmata', 'tika', 'lasīta', '.']);
});

test('grading accepts only the exact target form, not another auxiliary tense', () => {
  assert.equal(gradeChoice(roundItem, 'tiek').correct, true);
  assert.equal(gradeChoice(roundItem, 'tiks').correct, false);
  assert.equal(gradeChoice(roundItem, 'tika').correct, false);
  assert.equal(gradeChoice(roundItem, '').correct, false);
});
