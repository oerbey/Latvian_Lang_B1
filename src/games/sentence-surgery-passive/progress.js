/**
 * @file sentence-surgery-passive/progress.js
 * Persistence layer for Sentence Surgery – Passive.
 *
 * Tracks completed item IDs, total attempts, correct count,
 * and current streak. Normalises stored data on read to
 * prevent corrupt state from blocking gameplay.
 */

import { readGameProgress, writeGameProgress } from '../../lib/storage.js';
import { ALL_TOPICS, normalizeOrder, ORDER_SHUFFLE } from './logic.js';

const GAME_ID = 'sentence-surgery-passive';

export function createDefaultProgress() {
  return {
    completedItemIds: [],
    totalAttempts: 0,
    correctCount: 0,
    streak: 0,
    updatedAt: null,
    settings: {
      topic: ALL_TOPICS,
      order: ORDER_SHUFFLE,
    },
  };
}

function toSafeInt(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function normalizeCompletedIds(value, validIdSet = null) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const normalized = [];

  value.forEach((entry) => {
    if (typeof entry !== 'string' || !entry) return;
    if (validIdSet && !validIdSet.has(entry)) return;
    if (seen.has(entry)) return;
    seen.add(entry);
    normalized.push(entry);
  });

  return normalized;
}

export function normalizeSettings(settings, validTopics = []) {
  const safe = settings && typeof settings === 'object' ? settings : {};
  const allowedTopics = new Set(Array.isArray(validTopics) ? validTopics : []);
  let topic = typeof safe.topic === 'string' ? safe.topic.trim() : ALL_TOPICS;
  if (!topic || (allowedTopics.size && topic !== ALL_TOPICS && !allowedTopics.has(topic))) {
    topic = ALL_TOPICS;
  }
  return {
    topic,
    order: normalizeOrder(safe.order),
  };
}

export function normalizeProgress(progress, validIds = [], validTopics = []) {
  const validIdSet = validIds.length ? new Set(validIds) : null;
  const safe = progress && typeof progress === 'object' ? progress : {};
  const legacySettings = {
    topic: safe.topic,
    order: safe.order,
  };

  return {
    completedItemIds: normalizeCompletedIds(safe.completedItemIds, validIdSet),
    totalAttempts: toSafeInt(safe.totalAttempts),
    correctCount: toSafeInt(safe.correctCount),
    streak: toSafeInt(safe.streak),
    updatedAt: typeof safe.updatedAt === 'string' ? safe.updatedAt : null,
    settings: normalizeSettings(safe.settings || legacySettings, validTopics),
  };
}

export function updateProgressSettings(progress, settings, validIds = [], validTopics = []) {
  const next = normalizeProgress(progress, validIds, validTopics);
  next.settings = normalizeSettings({ ...next.settings, ...settings }, validTopics);
  return next;
}

export function recordProgressAttempt(
  progress,
  { correct = false, updatedAt = null } = {},
  validIds = [],
  validTopics = [],
) {
  const next = normalizeProgress(progress, validIds, validTopics);
  next.totalAttempts += 1;
  if (correct) {
    next.correctCount += 1;
    next.streak += 1;
  } else {
    next.streak = 0;
  }
  if (typeof updatedAt === 'string') {
    next.updatedAt = updatedAt;
  }
  return next;
}

export function markItemCompleted(progress, itemId, validIds = [], validTopics = []) {
  const next = normalizeProgress(progress, validIds, validTopics);
  const allowedIds = validIds.length ? new Set(validIds) : null;
  if (
    typeof itemId === 'string' &&
    itemId &&
    (!allowedIds || allowedIds.has(itemId)) &&
    !next.completedItemIds.includes(itemId)
  ) {
    next.completedItemIds.push(itemId);
  }
  return next;
}

export function applyProgressAttempt(
  progress,
  { itemId = '', correct = false, review = false, updatedAt = null } = {},
  validIds = [],
  validTopics = [],
) {
  const attempted = recordProgressAttempt(progress, { correct, updatedAt }, validIds, validTopics);
  return correct && !review
    ? markItemCompleted(attempted, itemId, validIds, validTopics)
    : attempted;
}

export function readProgress(validIds = [], validTopics = []) {
  try {
    const parsed = readGameProgress(GAME_ID, createDefaultProgress());
    return normalizeProgress(parsed, validIds, validTopics);
  } catch (error) {
    console.warn('Failed to read sentence surgery progress', error);
    return normalizeProgress(createDefaultProgress(), validIds, validTopics);
  }
}

export function persistProgress(progress, validIds = [], validTopics = []) {
  const normalized = normalizeProgress(progress, validIds, validTopics);
  try {
    writeGameProgress(GAME_ID, normalized);
  } catch (error) {
    console.warn('Failed to persist sentence surgery progress', error);
  }
  return normalized;
}
