/**
 * Pure round, grading, and queue helpers for Sentence Surgery – Passive.
 */

import { joinTokens } from './tokenize.js';

export const ALL_TOPICS = 'all';
export const ORDER_SHUFFLE = 'shuffle';
export const ORDER_SEQUENTIAL = 'sequential';
export const QUEUE_UNSOLVED = 'unsolved';
export const QUEUE_REVIEW = 'review';

export function normalizeOrder(value) {
  return value === ORDER_SEQUENTIAL ? ORDER_SEQUENTIAL : ORDER_SHUFFLE;
}

export function filterItemsByTopic(items = [], topic = ALL_TOPICS) {
  if (!Array.isArray(items)) return [];
  if (!topic || topic === ALL_TOPICS) return [...items];
  return items.filter((item) => item?.topic === topic);
}

function toCompletedIdSet(completedItemIds) {
  if (completedItemIds instanceof Set) {
    return new Set(completedItemIds);
  }
  return new Set(Array.isArray(completedItemIds) ? completedItemIds : []);
}

function shuffledCopy(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const sample = Number(random());
    const boundedSample = Number.isFinite(sample)
      ? Math.min(Math.max(sample, 0), 1 - Number.EPSILON)
      : 0;
    const swapIndex = Math.floor(boundedSample * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function moveLastItemAwayFromFront(queue, lastItemId) {
  if (!lastItemId || queue.length < 2 || queue[0]?.id !== lastItemId) {
    return queue;
  }
  const swapIndex = queue.findIndex((item) => item?.id !== lastItemId);
  if (swapIndex > 0) {
    [queue[0], queue[swapIndex]] = [queue[swapIndex], queue[0]];
  }
  return queue;
}

export function createQueue(
  items = [],
  {
    topic = ALL_TOPICS,
    order = ORDER_SHUFFLE,
    completedItemIds = [],
    kind = QUEUE_UNSOLVED,
    lastItemId = null,
    random = Math.random,
  } = {},
) {
  const completedIds = toCompletedIdSet(completedItemIds);
  const filtered = filterItemsByTopic(items, topic).filter((item) => {
    const isCompleted = completedIds.has(item?.id);
    return kind === QUEUE_REVIEW ? isCompleted : !isCompleted;
  });
  const queue =
    normalizeOrder(order) === ORDER_SEQUENTIAL ? [...filtered] : shuffledCopy(filtered, random);
  return moveLastItemAwayFromFront(queue, lastItemId);
}

export function createUnsolvedQueue(items = [], options = {}) {
  return createQueue(items, { ...options, kind: QUEUE_UNSOLVED });
}

export function createReviewQueue(items = [], options = {}) {
  return createQueue(items, { ...options, kind: QUEUE_REVIEW });
}

function getRepairIndex(item) {
  const index = Number.isInteger(item?.primaryEditableIndex)
    ? item.primaryEditableIndex
    : item?.editableIndices?.[0];
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Sentence Surgery item is missing a valid repair index');
  }
  return index;
}

function getChoices(item) {
  const candidates = Array.isArray(item?.choices)
    ? item.choices
    : Array.isArray(item?.wordBank)
      ? item.wordBank
      : [];
  return [...candidates];
}

export function createRoundViewModel(item, { selectedChoice = '' } = {}) {
  if (!item || typeof item !== 'object') {
    throw new Error('A normalized Sentence Surgery item is required');
  }
  const repairIndex = getRepairIndex(item);
  const brokenTokens = [...(item.brokenTokens || [])];
  const targetTokens = [...(item.targetTokens || [])];
  const brokenToken = brokenTokens[repairIndex] || '';
  const targetToken = targetTokens[repairIndex] || '';
  const normalizedChoice = typeof selectedChoice === 'string' ? selectedChoice.trim() : '';
  const currentTokens = [...brokenTokens];
  if (normalizedChoice) {
    currentTokens[repairIndex] = normalizedChoice;
  }

  return {
    itemId: item.id,
    topic: item.topic,
    source: item.source,
    targetEn: item.targetEn,
    error: item.errors?.[0] || null,
    repairIndex,
    prefixTokens: brokenTokens.slice(0, repairIndex),
    suffixTokens: brokenTokens.slice(repairIndex + 1),
    brokenToken,
    targetToken,
    choices: getChoices(item),
    selectedChoice: normalizedChoice,
    currentTokens,
    currentSentence: joinTokens(currentTokens),
    brokenSentence: joinTokens(brokenTokens),
    targetSentence: joinTokens(targetTokens),
  };
}

export function gradeChoice(item, choice) {
  const round = createRoundViewModel(item, { selectedChoice: choice });
  const selectedChoice = round.selectedChoice;
  const correct = selectedChoice !== '' && selectedChoice === round.targetToken;
  return {
    correct,
    selectedChoice,
    correctChoice: round.targetToken,
    repairedTokens: round.currentTokens,
    repairedSentence: round.currentSentence,
    targetSentence: round.targetSentence,
  };
}
