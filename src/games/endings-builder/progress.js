import { loadJSON, loadString, saveJSON, saveString } from '../../lib/storage.js';

export function loadProgress(key) {
  try {
    const parsed = loadJSON(key, null);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

export function saveProgress(key, progress) {
  saveJSON(key, progress);
}

export function loadStrict(key) {
  return loadString(key, '') === '1';
}

export function saveStrict(key, value) {
  saveString(key, value ? '1' : '0');
}
