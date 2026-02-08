import { readGameProgress, writeGameProgress } from '../../lib/storage.js';

const GAME_ID = 'sentence-surgery-passive';

const DEFAULT_PROGRESS = {
  completedItemIds: [],
  totalAttempts: 0,
  correctCount: 0,
  streak: 0,
  updatedAt: null,
};

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

export function normalizeProgress(progress, validIds = []) {
  const validIdSet = validIds.length ? new Set(validIds) : null;
  const safe = progress && typeof progress === 'object' ? progress : {};

  return {
    completedItemIds: normalizeCompletedIds(safe.completedItemIds, validIdSet),
    totalAttempts: toSafeInt(safe.totalAttempts),
    correctCount: toSafeInt(safe.correctCount),
    streak: toSafeInt(safe.streak),
    updatedAt: typeof safe.updatedAt === 'string' ? safe.updatedAt : null,
  };
}

export function readProgress(validIds = []) {
  try {
    const parsed = readGameProgress(GAME_ID, DEFAULT_PROGRESS);
    return normalizeProgress(parsed, validIds);
  } catch (error) {
    console.warn('Failed to read sentence surgery progress', error);
    return normalizeProgress(DEFAULT_PROGRESS, validIds);
  }
}

export function persistProgress(progress, validIds = []) {
  const normalized = normalizeProgress(progress, validIds);
  try {
    writeGameProgress(GAME_ID, normalized);
  } catch (error) {
    console.warn('Failed to persist sentence surgery progress', error);
  }
  return normalized;
}
