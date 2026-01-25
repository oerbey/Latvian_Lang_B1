const STORAGE_PROBE_KEY = '__llb1_storage_probe__';
const APP_STATE_KEY = 'llb1:app-state';
const PROGRESS_KEY = 'llb1:progress';
export const CURRENT_SCHEMA_VERSION = 1;
export const PROGRESS_SCHEMA_VERSION = 1;

/**
 * @typedef {Object} AppState
 * @property {number} schemaVersion
 * @property {string | null} theme
 * @property {string | null} language
 */

/**
 * @typedef {Object} GameProgressEntry
 * @property {string | null} updatedAt
 * @property {Record<string, any>} data
 */

/**
 * @typedef {Object} ProgressState
 * @property {number} schemaVersion
 * @property {boolean} legacyMigrated
 * @property {Record<string, GameProgressEntry>} games
 */

// Known storage keys (shapes in comments):
// - bs-theme: string ("light" | "dark") theme preference
// - lang: string (endings-builder language override)
// - llb1:progress: { schemaVersion, legacyMigrated, games }
// Legacy progress keys (migrated into llb1:progress):
// - eb-progress-v1: { [itemId]: number }
// - eb-strict-v1: string ("1" | "0")
// - characterTraits:lastResult: { correct, total, percent, mode }
// - llb1:decl6-detective:progress: { xp, streak, lastPlayedISO }
// - llb1:duty-dispatcher:progress: { xp, streak, lastPlayedISO }
// - llb1:maini-vai-mainies:progress: { xp, streak, lastPlayedISO }
// - llb1:passive-lab:progress: { xp, streak, lastPlayedISO }
// - llb1:travel-tracker:progress: { levelIndex, routeIndex, score, streak, started, seed }
// - dv_config, dv_activeSet, dv_cursor, dv_recentSets, dv_stats: matching game state objects
// - llb1:app-state: { schemaVersion, theme, language }

let cachedStorage = null;
let storageChecked = false;

/** @returns {Storage | null} */
function getStorage() {
  if (storageChecked) return cachedStorage;
  storageChecked = true;
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) {
    cachedStorage = null;
    return cachedStorage;
  }
  try {
    globalThis.localStorage.setItem(STORAGE_PROBE_KEY, '1');
    globalThis.localStorage.removeItem(STORAGE_PROBE_KEY);
    cachedStorage = globalThis.localStorage;
  } catch {
    cachedStorage = null;
  }
  return cachedStorage;
}

/** @param {unknown} value @returns {value is Record<string, any>} */
function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {string} key
 * @param {string | null} fallback
 * @returns {string | null}
 */
export function loadString(key, fallback = null) {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
export function saveString(key, value) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @param {(value: unknown) => boolean} [validate]
 * @returns {T}
 */
export function loadJSON(key, fallback, validate) {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof validate === 'function' && !validate(parsed)) return fallback;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean}
 */
export function saveJSON(key, value) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 * @returns {boolean}
 */
export function remove(key) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** @returns {AppState} */
export function defaultAppState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    theme: null,
    language: null,
  };
}

/**
 * @param {unknown} state
 * @returns {AppState}
 */
export function migrateAppState(state) {
  if (!isPlainObject(state)) {
    return defaultAppState();
  }
  const version = typeof state.schemaVersion === 'number' ? state.schemaVersion : 0;
  if (version === CURRENT_SCHEMA_VERSION) {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      theme: typeof state.theme === 'string' ? state.theme : null,
      language: typeof state.language === 'string' ? state.language : null,
    };
  }
  if (version === 0) {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      theme: typeof state.theme === 'string' ? state.theme : null,
      language: typeof state.language === 'string' ? state.language : null,
    };
  }
  return defaultAppState();
}

/** @returns {AppState} */
export function loadAppState() {
  const stored = loadJSON(APP_STATE_KEY, null, isPlainObject);
  return migrateAppState(stored ?? {});
}

/**
 * @param {unknown} state
 * @returns {AppState}
 */
export function saveAppState(state) {
  const next = migrateAppState(state ?? {});
  saveJSON(APP_STATE_KEY, next);
  return next;
}

/** @returns {ProgressState} */
function defaultProgressState() {
  /** @type {Record<string, GameProgressEntry>} */
  const games = {};
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    legacyMigrated: false,
    games,
  };
}

/**
 * @param {unknown} entry
 * @returns {GameProgressEntry}
 */
function normalizeGameEntry(entry) {
  if (!isPlainObject(entry)) {
    return { updatedAt: null, data: {} };
  }
  const updatedAt = typeof entry.updatedAt === 'string' ? entry.updatedAt : null;
  const data = isPlainObject(entry.data) ? entry.data : {};
  return { updatedAt, data };
}

/**
 * @param {unknown} state
 * @returns {ProgressState}
 */
function migrateProgressState(state) {
  if (!isPlainObject(state)) {
    return defaultProgressState();
  }
  const version = typeof state.schemaVersion === 'number' ? state.schemaVersion : 0;
  if (version !== PROGRESS_SCHEMA_VERSION) {
    return defaultProgressState();
  }
  /** @type {Record<string, GameProgressEntry>} */
  const games = {};
  if (isPlainObject(state.games)) {
    Object.entries(state.games).forEach(([key, value]) => {
      games[key] = normalizeGameEntry(value);
    });
  }
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    legacyMigrated: state.legacyMigrated === true,
    games,
  };
}

/**
 * @param {ProgressState} state
 * @param {string} gameId
 * @param {Record<string, any>} data
 * @param {string | null} [updatedAt]
 * @returns {ProgressState}
 */
function setGameProgress(state, gameId, data, updatedAt = null) {
  if (!gameId) return state;
  return {
    ...state,
    games: {
      ...state.games,
      [gameId]: {
        updatedAt: updatedAt || new Date().toISOString(),
        data: isPlainObject(data) ? data : {},
      },
    },
  };
}

/**
 * @param {ProgressState} state
 * @returns {ProgressState}
 */
function migrateLegacyProgress(state) {
  if (state.legacyMigrated) return state;
  let next = { ...state, games: { ...state.games } };
  const now = new Date().toISOString();

  const legacyDecl6 = loadJSON('llb1:decl6-detective:progress', null, isPlainObject);
  if (legacyDecl6 && !next.games['decl6-detective']) {
    next = setGameProgress(
      next,
      'decl6-detective',
      {
        xp: Number.isFinite(legacyDecl6.xp) ? legacyDecl6.xp : 0,
        streak: Number.isFinite(legacyDecl6.streak) ? legacyDecl6.streak : 0,
        lastPlayedISO:
          typeof legacyDecl6.lastPlayedISO === 'string' ? legacyDecl6.lastPlayedISO : null,
      },
      legacyDecl6.lastPlayedISO || now,
    );
  }

  const legacyDuty = loadJSON('llb1:duty-dispatcher:progress', null, isPlainObject);
  if (legacyDuty && !next.games['duty-dispatcher']) {
    next = setGameProgress(
      next,
      'duty-dispatcher',
      {
        xp: Number.isFinite(legacyDuty.xp) ? legacyDuty.xp : 0,
        streak: Number.isFinite(legacyDuty.streak) ? legacyDuty.streak : 0,
        lastPlayedISO:
          typeof legacyDuty.lastPlayedISO === 'string' ? legacyDuty.lastPlayedISO : null,
      },
      legacyDuty.lastPlayedISO || now,
    );
  }

  const legacyMaini = loadJSON('llb1:maini-vai-mainies:progress', null, isPlainObject);
  if (legacyMaini && !next.games['maini-vai-mainies']) {
    next = setGameProgress(
      next,
      'maini-vai-mainies',
      {
        xp: Number.isFinite(legacyMaini.xp) ? legacyMaini.xp : 0,
        streak: Number.isFinite(legacyMaini.streak) ? legacyMaini.streak : 0,
        lastPlayedISO:
          typeof legacyMaini.lastPlayedISO === 'string' ? legacyMaini.lastPlayedISO : null,
      },
      legacyMaini.lastPlayedISO || now,
    );
  }

  const legacyPassive = loadJSON('llb1:passive-lab:progress', null, isPlainObject);
  if (legacyPassive && !next.games['passive-lab']) {
    next = setGameProgress(
      next,
      'passive-lab',
      {
        xp: Number.isFinite(legacyPassive.xp) ? legacyPassive.xp : 0,
        streak: Number.isFinite(legacyPassive.streak) ? legacyPassive.streak : 0,
        lastPlayedISO:
          typeof legacyPassive.lastPlayedISO === 'string' ? legacyPassive.lastPlayedISO : null,
      },
      legacyPassive.lastPlayedISO || now,
    );
  }

  const legacyTravel = loadJSON('llb1:travel-tracker:progress', null, isPlainObject);
  if (legacyTravel && !next.games['travel-tracker']) {
    next = setGameProgress(
      next,
      'travel-tracker',
      {
        levelIndex: Number.isInteger(legacyTravel.levelIndex) ? legacyTravel.levelIndex : 0,
        routeIndex: Number.isInteger(legacyTravel.routeIndex) ? legacyTravel.routeIndex : 0,
        score: Number.isInteger(legacyTravel.score) ? legacyTravel.score : 0,
        streak: Number.isInteger(legacyTravel.streak) ? legacyTravel.streak : 0,
        started: typeof legacyTravel.started === 'boolean' ? legacyTravel.started : false,
        seed: Number.isFinite(legacyTravel.seed) ? legacyTravel.seed : null,
      },
      now,
    );
  }

  const legacyEndings = loadJSON('eb-progress-v1', null, isPlainObject);
  const legacyStrict = loadString('eb-strict-v1', null);
  if ((legacyEndings || legacyStrict !== null) && !next.games['endings-builder']) {
    next = setGameProgress(
      next,
      'endings-builder',
      {
        itemProgress: isPlainObject(legacyEndings) ? legacyEndings : {},
        strict: legacyStrict === '1',
      },
      now,
    );
  }

  const legacyTraits = loadJSON('characterTraits:lastResult', null, isPlainObject);
  if (legacyTraits && !next.games['character-traits']) {
    next = setGameProgress(
      next,
      'character-traits',
      {
        lastResult: legacyTraits,
      },
      now,
    );
  }

  next.legacyMigrated = true;

  if (legacyDecl6) remove('llb1:decl6-detective:progress');
  if (legacyDuty) remove('llb1:duty-dispatcher:progress');
  if (legacyMaini) remove('llb1:maini-vai-mainies:progress');
  if (legacyPassive) remove('llb1:passive-lab:progress');
  if (legacyTravel) remove('llb1:travel-tracker:progress');
  if (legacyEndings) remove('eb-progress-v1');
  if (legacyStrict !== null) remove('eb-strict-v1');
  if (legacyTraits) remove('characterTraits:lastResult');

  return next;
}

/** @returns {ProgressState} */
export function loadProgressState() {
  const stored = loadJSON(PROGRESS_KEY, null, isPlainObject);
  let next = migrateProgressState(stored ?? {});
  next = migrateLegacyProgress(next);
  saveJSON(PROGRESS_KEY, next);
  return next;
}

/**
 * @param {unknown} state
 * @returns {ProgressState}
 */
export function saveProgressState(state) {
  const next = migrateProgressState(state ?? {});
  saveJSON(PROGRESS_KEY, next);
  return next;
}

/**
 * @param {string} gameId
 * @param {Record<string, any>} fallback
 * @returns {Record<string, any>}
 */
export function readGameProgress(gameId, fallback = {}) {
  const state = loadProgressState();
  const entry = state.games?.[gameId];
  if (!entry || !isPlainObject(entry.data)) {
    return { ...fallback };
  }
  return { ...fallback, ...entry.data };
}

/**
 * @param {string} gameId
 * @param {Record<string, any>} data
 * @returns {Record<string, any>}
 */
export function writeGameProgress(gameId, data) {
  const state = loadProgressState();
  const next = setGameProgress(state, gameId, data);
  saveProgressState(next);
  return next.games?.[gameId]?.data || {};
}

/**
 * @param {string} gameId
 * @param {(current: Record<string, any>) => Record<string, any>} updater
 * @param {Record<string, any>} fallback
 * @returns {Record<string, any>}
 */
export function updateGameProgress(gameId, updater, fallback = {}) {
  const current = readGameProgress(gameId, fallback);
  const next = typeof updater === 'function' ? updater(current) : current;
  return writeGameProgress(gameId, next);
}

/**
 * @param {string} gameId
 * @returns {boolean}
 */
export function clearGameProgress(gameId) {
  const state = loadProgressState();
  if (state.games && state.games[gameId]) {
    const next = { ...state, games: { ...state.games } };
    delete next.games[gameId];
    saveProgressState(next);
    return true;
  }
  return false;
}
