import { loadJSON, remove, saveJSON } from '../storage.js';

export function readState(key, fallback) {
  return loadJSON(key, fallback);
}

export function writeState(key, value) {
  if (value === null || value === undefined) {
    remove(key);
    return;
  }
  saveJSON(key, value);
}
