import { EXERCISES } from './exercise-registry.js';

const RETURN_KEY = 'llb1:auth:return';
const destinations = new Set([
  '/',
  '/index.html',
  '/my-progress.html',
  ...EXERCISES.map(({ href }) => `/${href}`),
]);

/** Accept only published local pages, without query strings or callback credentials. */
export function safeAuthReturnPath(value) {
  return destinations.has(value) ? value : '/index.html';
}

export function rememberAuthReturn(path, storage) {
  (storage || window.sessionStorage).setItem(RETURN_KEY, safeAuthReturnPath(path));
}

/** Missing or inaccessible tab storage always returns to Home, never a callback or API. */
export function readAuthReturn(storage) {
  try {
    return safeAuthReturnPath((storage || window.sessionStorage).getItem(RETURN_KEY));
  } catch {
    return '/index.html';
  }
}

export function consumeAuthReturn(storage) {
  const path = readAuthReturn(storage);
  try {
    (storage || window.sessionStorage).removeItem(RETURN_KEY);
  } catch {
    // The destination is still safe if browser storage is inaccessible.
  }
  return path;
}
