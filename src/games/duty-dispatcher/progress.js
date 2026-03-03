import { readGameProgress, writeGameProgress } from '../../lib/storage.js';

const GAME_ID = 'duty-dispatcher';

/**
 * Read game progress from storage (XP and streak).
 * Validates numeric values; returns default {xp: 0, streak: 0} if missing/invalid.
 * @returns {object | null}
 */
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

/**
 * Save game progress to storage with timestamp.
 * Silently fails on write errors to avoid blocking gameplay.
 * @param {number} score - XP points earned
 * @param {number} streak - Correct answers in a row
 */
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
