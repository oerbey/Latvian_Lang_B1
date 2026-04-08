/**
 * @file matching-game/constants.js
 * Shared constants and default UI text for the matching-game engine.
 *
 * Defines MODE_ALL / MODE_LOCKED identifiers and Latvian/English
 * default feedback strings used by all matching-game instances.
 */

export const MODE_ALL = 'all';
export const MODE_LOCKED = 'locked';

export const DEFAULT_TEXTS = {
  correct: 'Labi! Pareizs pāris.',
  incorrect: (lv, tr) => `Nē. “${lv}” nav “${tr}”. Pamēģini vēlreiz.`,
  lockedMissing: 'Create a locked set via “New mix”.',
  lockedReady: (count) => `Locked set ready: ${count} items.`,
  lockedNote: {
    capped: (poolSize) => `Only ${poolSize} items available, so the set is capped.`,
    smallSet: (setSize) =>
      `Board shows all ${setSize} items because the set is smaller than the board size.`,
  },
  dataUnavailable: 'Dati nav pieejami bezsaistē. Mēģini vēlreiz ar internetu.',
  fallbackUsed:
    'Dati ielādēti no iebūvētās kopijas. Atver lapu caur serveri, lai redzētu jaunāko sarakstu.',
};
