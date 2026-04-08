/**
 * @file endings-builder/progress.js
 * Persistence layer for the Endings Builder game.
 *
 * Stores per-item mastery scores (spaced-repetition weight)
 * and a strict-mode flag in localStorage via the shared storage module.
 */

import { readGameProgress, writeGameProgress } from '../../lib/storage.js';

const GAME_ID = 'endings-builder';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function loadProgress() {
  const stored = readGameProgress(GAME_ID, { itemProgress: {}, strict: false });
  return isPlainObject(stored?.itemProgress) ? stored.itemProgress : {};
}

export function saveProgress(progress) {
  const stored = readGameProgress(GAME_ID, { itemProgress: {}, strict: false });
  writeGameProgress(GAME_ID, {
    ...stored,
    itemProgress: isPlainObject(progress) ? progress : {},
  });
}

export function loadStrict() {
  const stored = readGameProgress(GAME_ID, { itemProgress: {}, strict: false });
  return stored?.strict === true;
}

export function saveStrict(value) {
  const stored = readGameProgress(GAME_ID, { itemProgress: {}, strict: false });
  writeGameProgress(GAME_ID, {
    ...stored,
    strict: Boolean(value),
  });
}
