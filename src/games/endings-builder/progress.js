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
