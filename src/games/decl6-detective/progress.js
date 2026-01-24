import { readGameProgress, writeGameProgress } from '../../lib/storage.js';

const GAME_ID = 'decl6-detective';

export function readProgress() {
  try {
    const parsed = readGameProgress(GAME_ID, { xp: 0, streak: 0, lastPlayedISO: null });
    return {
      xp: Number.isFinite(parsed?.xp) ? parsed.xp : 0,
      streak: Number.isFinite(parsed?.streak) ? parsed.streak : 0,
      lastPlayedISO: typeof parsed?.lastPlayedISO === 'string' ? parsed.lastPlayedISO : null,
    };
  } catch (err) {
    console.warn('Failed to read decl6 progress', err);
    return { xp: 0, streak: 0, lastPlayedISO: null };
  }
}

export function persistProgress(payload, touchLastPlayed = false) {
  const next = {
    xp: payload.xp ?? 0,
    streak: payload.streak ?? 0,
    lastPlayedISO: touchLastPlayed ? new Date().toISOString() : payload.lastPlayedISO ?? null,
  };
  try {
    writeGameProgress(GAME_ID, next);
  } catch (err) {
    console.warn('Unable to persist decl6 progress', err);
  }
  return next;
}
