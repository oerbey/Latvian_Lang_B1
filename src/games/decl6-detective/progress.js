import { loadJSON, saveJSON } from '../../lib/storage.js';

export function readProgress(key) {
  try {
    const parsed = loadJSON(key, null);
    if (!parsed || typeof parsed !== 'object') {
      return { xp: 0, streak: 0, lastPlayedISO: null };
    }
    return {
      xp: Number.isFinite(parsed?.xp) ? parsed.xp : 0,
      streak: Number.isFinite(parsed?.streak) ? parsed.streak : 0,
      lastPlayedISO: parsed?.lastPlayedISO ?? null,
    };
  } catch (err) {
    console.warn('Failed to read decl6 progress', err);
    return { xp: 0, streak: 0, lastPlayedISO: null };
  }
}

export function persistProgress(key, payload, touchLastPlayed = false) {
  const next = {
    xp: payload.xp ?? 0,
    streak: payload.streak ?? 0,
    lastPlayedISO: touchLastPlayed ? new Date().toISOString() : payload.lastPlayedISO ?? null,
  };
  try {
    saveJSON(key, next);
  } catch (err) {
    console.warn('Unable to persist decl6 progress', err);
  }
  return next;
}
