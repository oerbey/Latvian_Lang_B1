const STORAGE_PROBE_KEY = '__llb1_storage_probe__';
const APP_STATE_KEY = 'llb1:app-state';
export const CURRENT_SCHEMA_VERSION = 1;

// Known storage keys (shapes in comments):
// - bs-theme: string ("light" | "dark") theme preference
// - lang: string (endings-builder language override)
// - eb-progress-v1: { attempts, correct, streak, lastAttemptISO }
// - eb-strict-v1: string ("1" | "0")
// - characterTraits:lastResult: { score, total, createdAt, mode }
// - llb1:decl6-detective:progress: { xp, streak, lastPlayedISO }
// - llb1:duty-dispatcher:progress: { xp, streak, lastPlayedISO }
// - llb1:maini-vai-mainies:progress: { xp, streak, lastPlayedISO }
// - llb1:passive-lab:progress: { xp, streak, lastPlayedISO }
// - llb1:travel-tracker:progress: { xp, streak, completed, lastPlayedISO }
// - dv_config, dv_activeSet, dv_cursor, dv_recentSets, dv_stats: matching game state objects
// - llb1:app-state: { schemaVersion, theme, language }

let cachedStorage = null;
let storageChecked = false;

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

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

export function defaultAppState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    theme: null,
    language: null,
  };
}

export function migrateAppState(state) {
  const version = typeof state?.schemaVersion === 'number' ? state.schemaVersion : 0;
  if (!isPlainObject(state)) {
    return defaultAppState();
  }
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

export function loadAppState() {
  const stored = loadJSON(APP_STATE_KEY, null, isPlainObject);
  return migrateAppState(stored ?? {});
}

export function saveAppState(state) {
  const next = migrateAppState(state ?? {});
  saveJSON(APP_STATE_KEY, next);
  return next;
}
