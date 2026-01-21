import { loadJSON, saveJSON } from '../../lib/storage.js';

export function readProgress(key) {
  try {
    const parsed = loadJSON(key, null);
    if (!parsed || typeof parsed !== 'object') return null;
    const xp = Number(parsed.xp);
    const streak = Number(parsed.streak);
    return {
      xp: Number.isFinite(xp) ? xp : 0,
      streak: Number.isFinite(streak) ? streak : 0,
    };
  } catch (err) {
    console.warn('Unable to read stored progress', err);
    return null;
  }
}

export function persistProgress(key, score, streak) {
  try {
    const data = {
      xp: score,
      streak,
      lastPlayedISO: new Date().toISOString(),
    };
    saveJSON(key, data);
  } catch (err) {
    console.warn('Unable to persist progress', err);
  }
}
