import { accuracy, isCount, isPlainObject } from './common.js';

export const MAX_BOX = 4;
export const ROUND_SIZE = 10;
const roundLimit = ROUND_SIZE * 2;
const recordFields = ['box', 'dueAt', 'seen', 'correct', 'wrong'];
const validId = (id) =>
  typeof id === 'string' && id.length > 0 && id.length <= 160 && !(id in Object.prototype);
function validDate(date) {
  if (date === '') return true;
  if (typeof date !== 'string' || date.length > 27) return false;
  const time = Date.parse(date);
  return Number.isFinite(time) && new Date(time).toISOString() === date;
}

function validCheckpoint(checkpoint) {
  if (checkpoint === null) return true;
  if (!isPlainObject(checkpoint)) return false;
  const { queue, retried, review, answered, correct, streak, bestStreak, xp } = checkpoint;
  return (
    Array.isArray(queue) &&
    Array.isArray(retried) &&
    queue.every(validId) &&
    retried.every(validId) &&
    retried.length <= ROUND_SIZE &&
    new Set(queue).size === queue.length &&
    new Set(retried).size === retried.length &&
    [answered, correct, streak, bestStreak, xp].every(isCount) &&
    answered + queue.length > 0 &&
    answered + queue.length <= roundLimit &&
    streak <= bestStreak &&
    bestStreak <= correct &&
    correct <= answered &&
    isPlainObject(review) &&
    Object.keys(review).length <= answered &&
    Object.entries(review).every(
      ([id, boxes]) =>
        validId(id) &&
        Array.isArray(boxes) &&
        boxes.length === 2 &&
        boxes.every((box) => isCount(box) && box <= MAX_BOX),
    )
  );
}

/** Validate the mastery records and safe prompt boundary shared by adaptive games. */
export function validateAdaptiveLearning(data) {
  if (!validDate(data.lastPlayedISO) || !validDate(data.lastAnswerISO))
    return 'invalid activity date';
  if (!isPlainObject(data.records)) return 'invalid mastery records';
  let attempts = 0;
  for (const [id, record] of Object.entries(data.records)) {
    if (
      !validId(id) ||
      !isPlainObject(record) ||
      !recordFields.every((field) => isCount(record[field])) ||
      record.box > MAX_BOX
    )
      return 'invalid mastery record';
    attempts += record.correct + record.wrong;
    if (!isCount(attempts)) return 'invalid attempt total';
  }
  return validCheckpoint(data.checkpoint) ? null : 'invalid round checkpoint';
}

/** Count retired items in lifetime results and only current items in mastery. */
export function summarizeAdaptiveLearning(data, { itemIds } = {}) {
  let correct = 0;
  let wrong = 0;
  for (const record of Object.values(data.records)) {
    correct += record.correct;
    wrong += record.wrong;
  }
  const attempts = correct + wrong;
  const ids = itemIds === undefined ? null : new Set(itemIds);
  return {
    attempts,
    correct,
    accuracy: accuracy(correct, attempts),
    lastPlayedAt: data.lastAnswerISO || data.lastPlayedISO || null,
    mastery: ids && {
      mastered: [...ids].filter((id) => {
        const record = data.records[id];
        return record?.seen > 0 && record.box === MAX_BOX;
      }).length,
      total: ids.size,
    },
    xp: data.xp,
    bestStreak: data.bestStreak,
  };
}
