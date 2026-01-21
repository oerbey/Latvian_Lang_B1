import { MULBERRY32_CONSTANT } from './constants.js';
import { pickRandom, shuffleInPlace } from './utils.js';

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = a + MULBERRY32_CONSTANT | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const MODES = { MATCH: 'MATCH', FORGE: 'FORGE' };

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

let currentState = createInitialState();
const subscribers = new Set();

function notify(prevState) {
  subscribers.forEach((listener) => {
    try {
      listener(currentState, prevState);
    } catch (err) {
      console.warn('State subscriber failed', err);
    }
  });
}

export function getState() {
  return currentState;
}

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

export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function shuffle(arr) {
  return shuffleInPlace(arr, currentState.rng);
}

export function choice(arr) {
  return pickRandom(arr, currentState.rng);
}

export function now() {
  return performance.now();
}

export let HELP_TEXT = '';
export function setHelpText(t) { HELP_TEXT = t; }
let redraw = () => { };
export function setRedraw(fn) { redraw = fn; }
export function triggerRedraw() { redraw(); }
