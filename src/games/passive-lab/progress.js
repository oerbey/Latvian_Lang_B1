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
    console.warn('Failed to read passive lab progress', err);
    return { xp: 0, streak: 0, lastPlayedISO: null };
  }
}

export function persistProgress(key, progress) {
  try {
    saveJSON(key, progress);
  } catch (err) {
    console.warn('Unable to persist passive lab progress', err);
  }
}

export function formatLastPlayed(value) {
  if (!value) return '—';
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return '—';
  return when.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}
