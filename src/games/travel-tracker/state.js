import { createSeededRng, seededShuffle } from './utils.js';

const SESSION_SEED_KEY = 'llb1:travel-tracker:seed';

export function createState() {
  return {
    levels: [],
    originalLevels: [],
    levelIndex: 0,
    routeIndex: 0,
    score: 0,
    streak: 0,
    started: false,
    routeCompleted: false,
    inputLocked: true,
    totalRoutes: 0,
    seed: 0,
  };
}

function generateSeed() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    return buffer[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

function persistSessionSeed(seed) {
  try {
    sessionStorage.setItem(SESSION_SEED_KEY, String(seed));
  } catch (err) {
    console.warn('Unable to persist travel tracker seed to sessionStorage', err);
  }
}

export function readSessionSeed() {
  try {
    const stored = sessionStorage.getItem(SESSION_SEED_KEY);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed)) {
        return parsed >>> 0;
      }
    }
  } catch (err) {
    console.warn('Unable to read travel tracker seed from sessionStorage', err);
  }
  const fresh = generateSeed();
  persistSessionSeed(fresh);
  return fresh;
}

export function clearSessionSeed() {
  try {
    sessionStorage.removeItem(SESSION_SEED_KEY);
  } catch (err) {
    console.warn('Unable to clear travel tracker seed from sessionStorage', err);
  }
}

function cloneLevels(levels) {
  return (levels ?? []).map(level => ({
    ...level,
    routes: [...(level.routes ?? [])],
  }));
}

function prepareLevels(levels, seed) {
  const baseLevels = cloneLevels(levels);
  if (!baseLevels.length) return [];
  const rng = createSeededRng(seed);
  const shuffledLevels = seededShuffle(baseLevels, rng).map(level => ({
    ...level,
    routes: seededShuffle(level.routes ?? [], rng),
  }));
  return shuffledLevels;
}

function computeTotalRoutes(levels) {
  return (levels ?? []).reduce((acc, level) => acc + (level.routes?.length ?? 0), 0);
}

export function applySeed(state, seed) {
  state.seed = (seed ?? generateSeed()) >>> 0;
  persistSessionSeed(state.seed);
  state.levels = prepareLevels(state.originalLevels, state.seed);
  state.totalRoutes = computeTotalRoutes(state.levels);
}

export function getCurrentLevel(state) {
  return state.levels[state.levelIndex] ?? null;
}

export function getCurrentRoute(state) {
  const level = getCurrentLevel(state);
  if (!level) return null;
  return level.routes[state.routeIndex] ?? null;
}

export function getProgressPosition(state) {
  const total = state.totalRoutes;
  if (!total) {
    return { current: 0, total: 0 };
  }
  let passed = 0;
  for (let i = 0; i < state.levelIndex; i += 1) {
    passed += state.levels[i]?.routes?.length ?? 0;
  }
  const current = passed + Math.min(state.routeIndex + 1, state.levels[state.levelIndex]?.routes?.length ?? 0);
  return { current, total };
}

export function computeNextPosition(state) {
  const level = getCurrentLevel(state);
  if (!level) return { levelIndex: 0, routeIndex: 0 };
  if (state.routeIndex + 1 < level.routes.length) {
    return { levelIndex: state.levelIndex, routeIndex: state.routeIndex + 1 };
  }
  const nextLevelIndex = (state.levelIndex + 1) % state.levels.length;
  return { levelIndex: nextLevelIndex, routeIndex: 0 };
}
