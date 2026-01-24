import { readGameProgress, writeGameProgress } from '../../lib/storage.js';

const GAME_ID = 'duty-dispatcher';

export function readProgress() {
  try {
    const parsed = readGameProgress(GAME_ID, { xp: 0, streak: 0, lastPlayedISO: null });
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

export function persistProgress(score, streak) {
  try {
    const data = {
      xp: score,
      streak,
      lastPlayedISO: new Date().toISOString(),
    };
    writeGameProgress(GAME_ID, data);
  } catch (err) {
    console.warn('Unable to persist progress', err);
  }
}
