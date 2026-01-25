import { readGameProgress, writeGameProgress } from '../../lib/storage.js';
import { formatDateTime } from '../../lib/i18n-format.js';

const GAME_ID = 'passive-lab';

export function readProgress() {
  try {
    const parsed = readGameProgress(GAME_ID, { xp: 0, streak: 0, lastPlayedISO: null });
    return {
      xp: Number.isFinite(parsed?.xp) ? parsed.xp : 0,
      streak: Number.isFinite(parsed?.streak) ? parsed.streak : 0,
      lastPlayedISO: typeof parsed?.lastPlayedISO === 'string' ? parsed.lastPlayedISO : null,
    };
  } catch (err) {
    console.warn('Failed to read passive lab progress', err);
    return { xp: 0, streak: 0, lastPlayedISO: null };
  }
}

export function persistProgress(progress) {
  try {
    writeGameProgress(GAME_ID, progress);
  } catch (err) {
    console.warn('Unable to persist passive lab progress', err);
  }
}

export function formatLastPlayed(value) {
  return formatDateTime(value);
}
