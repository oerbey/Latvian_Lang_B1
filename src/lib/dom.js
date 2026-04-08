/**
 * dom.js — Lightweight DOM utility helpers.
 * ==========================================
 * Provides safe element lookups and event binding used across the app.
 *
 * Exports:
 *   $id(id)         — getElementById wrapper; returns null if missing.
 *   mustId(id)      — getElementById that throws if the element is absent.
 *   on(el, ev, fn)  — addEventListener wrapper; silently no-ops if el is null.
 */

/**
 * @param {string} id
 * @returns {HTMLElement | null}
 */
export function $id(id) {
  return document.getElementById(id);
}

/**
 * Get element by ID; throws if not found (required elements only).
 * @param {string} id
 * @returns {HTMLElement}
 */
export function mustId(id) {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element: #${id}`);
  }
  return el;
}

/**
 * Add event listener with optional options.
 * @param {HTMLElement | null} el
 * @param {string} event
 * @param {EventListener} handler
 * @param {boolean | AddEventListenerOptions} [options]
 * @returns {boolean}
 */
export function on(el, event, handler, options) {
  if (!el || !el.addEventListener) {
    return false;
  }
  el.addEventListener(event, handler, options);
  return true;
}
