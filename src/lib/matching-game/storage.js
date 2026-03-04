/**
 * @file matching-game/storage.js
 * Persistence helpers for the matching-game engine.
 *
 * Reads/writes JSON config, active word sets, and locked-set state
 * to localStorage. Validates data shape on read with type-aware
 * fallbacks (object, array, number, boolean).
 */

import { loadJSON, remove, saveJSON } from '../storage.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readState(key, fallback, validate) {
  let validator = validate;
  if (!validator && isPlainObject(fallback)) {
    validator = isPlainObject;
  }
  if (!validator && Array.isArray(fallback)) {
    validator = Array.isArray;
  }
  if (!validator && typeof fallback === 'number') {
    validator = (value) => typeof value === 'number' && Number.isFinite(value);
  }
  return loadJSON(key, fallback, validator);
}

export function writeState(key, value) {
  if (value === null || value === undefined) {
    remove(key);
    return;
  }
  saveJSON(key, value);
}
