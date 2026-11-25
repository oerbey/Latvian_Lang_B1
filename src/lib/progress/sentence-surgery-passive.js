import { accuracy, assertValid, isCount, isPlainObject, validateJsonObject } from './common.js';

export const ALL_TOPICS = 'all';
export const ORDER_SHUFFLE = 'shuffle';
export const ORDER_SEQUENTIAL = 'sequential';
const maxBytes = 64 * 1024;
const validText = (value) => typeof value === 'string' && value.length > 0 && value.length <= 160;
const validList = (value) =>
  Array.isArray(value) && value.every(validText) && new Set(value).size === value.length;

export function createLearningProgress() {
  return {
    completedItemIds: [],
    totalAttempts: 0,
    correctCount: 0,
    streak: 0,
    updatedAt: null,
    settings: { topic: ALL_TOPICS, order: ORDER_SHUFFLE },
  };
}

function createDefault() {
  return { schemaVersion: 1, ...createLearningProgress(), checkpoint: null };
}

function validCheckpoint(checkpoint) {
  if (checkpoint === null) return true;
  return (
    isPlainObject(checkpoint) &&
    validList(checkpoint.remainingIds) &&
    isCount(checkpoint.position) &&
    isCount(checkpoint.position + checkpoint.remainingIds.length) &&
    typeof checkpoint.review === 'boolean' &&
    validList(checkpoint.wrongChoices) &&
    typeof checkpoint.hintUsed === 'boolean' &&
    (!checkpoint.remainingIds.length
      ? !checkpoint.wrongChoices.length && !checkpoint.hintUsed
      : true)
  );
}

function validate(data) {
  const sizeError = validateJsonObject(data, maxBytes);
  if (sizeError) return sizeError;
  if (data.schemaVersion !== 1) return 'unsupported schemaVersion';
  if (!validList(data.completedItemIds)) return 'invalid completed items';
  if (
    ![data.totalAttempts, data.correctCount, data.streak].every(isCount) ||
    data.correctCount > data.totalAttempts ||
    data.streak > data.correctCount
  )
    return 'invalid attempt counters';
  if (data.updatedAt !== null) {
    const time = typeof data.updatedAt === 'string' ? Date.parse(data.updatedAt) : NaN;
    if (!Number.isFinite(time) || new Date(time).toISOString() !== data.updatedAt)
      return 'invalid activity date';
  }
  if (
    !isPlainObject(data.settings) ||
    !validText(data.settings.topic) ||
    ![ORDER_SHUFFLE, ORDER_SEQUENTIAL].includes(data.settings.order)
  )
    return 'invalid settings';
  return validCheckpoint(data.checkpoint) ? null : 'invalid sentence checkpoint';
}

function normalize(data) {
  assertValid(validate(data));
  return Object.fromEntries(
    Object.keys(createDefault()).map((key) => [key, structuredClone(data[key])]),
  );
}

/** Count completed repairs from the current dataset and retain lifetime answer totals. */
function summarize(data, { itemIds } = {}) {
  assertValid(validate(data));
  const ids = itemIds === undefined ? null : new Set(itemIds);
  return {
    attempts: data.totalAttempts,
    correct: data.correctCount,
    accuracy: accuracy(data.correctCount, data.totalAttempts),
    lastPlayedAt: data.totalAttempts ? data.updatedAt : null,
    completion: ids && {
      completed: data.completedItemIds.filter((id) => ids.has(id)).length,
      total: ids.size,
    },
  };
}

export const sentenceSurgeryProgress = Object.freeze({
  schemaVersion: 1,
  maxBytes,
  createDefault,
  validate,
  normalize,
  summarize,
});
