import { MULBERRY32_CONSTANT } from './constants.js';
import { pickRandom, shuffleInPlace } from './utils.js';

/**
 * @typedef {'MATCH' | 'FORGE'} GameMode
 */

/**
 * @typedef {Object} AppState
 * @property {GameMode} mode
 * @property {'practice' | 'challenge'} difficulty
 * @property {'auto' | 'full'} deckSizeMode
 * @property {number} roundIndex
 * @property {() => number} rng
 * @property {object | null} matchState
 * @property {object | null} forgeState
 * @property {Array<object>} results
 * @property {boolean} showHelp
 * @property {object | null} DATA
 * @property {string} targetLang
 */

/**
 * @param {number} a
 * @returns {() => number}
 */
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + MULBERRY32_CONSTANT) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @type {{ MATCH: GameMode, FORGE: GameMode }} */
export const MODES = { MATCH: 'MATCH', FORGE: 'FORGE' };

/** @returns {AppState} */
function createInitialState() {
  return {
    mode: MODES.MATCH,
    difficulty: 'practice',
    deckSizeMode: 'auto',
    roundIndex: 0,
    rng: mulberry32(Date.now() >>> 0),
    matchState: null,
    forgeState: null,
    results: [],
    showHelp: false,
    DATA: null,
    targetLang: 'en',
  };
}

/** @type {AppState} */
let currentState = createInitialState();
const subscribers = new Set();

/** @param {AppState} prevState */
function notify(prevState) {
  subscribers.forEach((listener) => {
    try {
      listener(currentState, prevState);
    } catch (err) {
      console.warn('State subscriber failed', err);
    }
  });
}

/** @returns {AppState} */
export function getState() {
  return currentState;
}

/**
 * @param {Partial<AppState> | ((state: AppState) => AppState | void)} patch
 */
export function setState(patch) {
  const prevState = currentState;
  if (typeof patch === 'function') {
    const result = patch(currentState);
    if (result && typeof result === 'object') {
      currentState = result;
    }
  } else if (patch && typeof patch === 'object') {
    Object.assign(currentState, patch);
  }
  notify(prevState);
}

/** @param {(state: AppState) => void} mutator */
export function updateState(mutator) {
  const prevState = currentState;
  mutator(currentState);
  notify(prevState);
}

export function resetState() {
  const prevState = currentState;
  currentState = createInitialState();
  notify(prevState);
}

/** @param {(state: AppState, prevState: AppState) => void} listener */
export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

/** @template T @param {T[]} arr @returns {T[]} */
export function shuffle(arr) {
  return shuffleInPlace(arr, currentState.rng);
}

/** @template T @param {T[]} arr @returns {T | undefined} */
export function choice(arr) {
  return pickRandom(arr, currentState.rng);
}

export function now() {
  return performance.now();
}

export let HELP_TEXT = '';
export function setHelpText(t) {
  HELP_TEXT = t;
}
let redraw = () => {};
export function setRedraw(fn) {
  redraw = fn;
}
let redrawScheduled = false;

export function triggerRedraw() {
  if (typeof requestAnimationFrame !== 'function') {
    redraw();
    return;
  }
  if (redrawScheduled) return;
  redrawScheduled = true;
  requestAnimationFrame(() => {
    redrawScheduled = false;
    redraw();
  });
}
